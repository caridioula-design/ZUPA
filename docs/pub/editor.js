/* ZUPA PUB — éditeur de visuel 1000 × 800 : textes, images, formes et fond, déplaçables et modifiables.
   Usage : const ed = ZPEditor.mount(element, etatInitial, { onChange, logo, toast });
           ed.get() → état (à enregistrer), await ed.export() → image JPEG (data URL). */
(() => {
  'use strict';
  const W = 1000, H = 800;
  const PRESETS = { jaune: ['#ffe500', '#ffd000'], orange: ['#fb923c', '#c2410c'], rouge: ['#ef4444', '#991b1b'], vert: ['#22c55e', '#166534'], bleu: ['#38bdf8', '#075985'], violet: ['#a855f7', '#4c1d95'], noir: ['#262626', '#0a0a0a'], blanc: ['#ffffff', '#e5e7eb'] };
  const SWATCH = ['#111111', '#ffffff', '#e10e1e', '#ffd000', '#f97316', '#16a34a', '#2563eb', '#7c3aed', '#ec4899', '#78350f'];
  const FONTS = { t: "'Fredoka','Poppins',sans-serif", b: "'Poppins',system-ui,sans-serif" };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => 'o' + Math.random().toString(36).slice(2, 8);
  const clone = o => JSON.parse(JSON.stringify(o));
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const readFile = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });

  // ---------- modèles prédéfinis (tout reste modifiable dans l'éditeur) ----------
  const T = (text, x, y, size, color, o = {}) => ({ id: uid(), t: 'text', x, y, r: o.r || 0, s: 1, op: 1, text, font: o.font || 't', bold: o.bold !== false, color, size, stroke: !!o.stroke, strokeColor: o.sc || '#111111', shadow: !!o.shadow, align: 'center' });
  const R = (x, y, w, h, fill, radius = 18, o = {}) => ({ id: uid(), t: 'shape', kind: 'rect', x, y, r: o.r || 0, s: 1, op: o.op || 1, w, h, fill, radius });
  const C = (x, y, d, fill) => ({ id: uid(), t: 'shape', kind: 'circle', x, y, r: 0, s: 1, op: 1, w: d, h: d, fill, radius: 0 });
  const P = (x, y, w, h, o = {}) => ({ id: uid(), t: 'img', x, y, r: o.r || 0, s: 1, op: 1, src: null, w, h, round: !!o.round, radius: o.radius ?? 16, label: o.label || 'Votre photo' });
  const nm = d => d.commerce || 'Votre commerce', tel = d => d.tel ? String(d.tel).replace(/(\d{2})(?=\d)/g, '$1 ') : '07 00 00 00 00';
  const TEMPLATES = [
    { id: 'promo', nom: 'Promotion', build: d => fromTemplate(d) },
    { id: 'fastfood', nom: 'Menu fast-food', build: d => ({ v: 1, bg: { k: 'grad', c1: '#dc2626', c2: '#7f1d1d', angle: 150 }, objs: [
      T('MENU', 250, 95, 120, '#ffd000', { stroke: true, sc: '#7f1d1d', r: -3 }), T(nm(d), 690, 100, 44, '#ffffff', { font: 'b' }),
      ...[['Burger maison', '2 500 F', 265], ['Chawarma poulet', '2 000 F', 445], ['Frites + boisson', '1 000 F', 625]].flatMap(([a, b, y], i) => [
        R(500, y, 900, 150, 'rgba(0,0,0,.22)', 30), P(150, y, 150, 130, { round: true, label: 'Photo ' + (i + 1) }), T(a, 470, y, 52, '#ffffff', { font: 'b' }), C(830, y, 150, '#ffd000'), T(b, 830, y, 38, '#7f1d1d')]),
      R(500, 752, 1000, 96, '#ffd000', 0), T('Livraison · ' + tel(d), 500, 752, 42, '#7f1d1d', { font: 'b' })] }) },
    { id: 'resto', nom: 'Menu restaurant', build: d => ({ v: 1, bg: { k: 'grad', c1: '#1c1917', c2: '#0c0a09', angle: 160 }, objs: [
      T('Menu du jour', 500, 100, 96, '#e3b55c'), T(nm(d), 500, 175, 38, '#f5f5f4', { font: 'b', bold: false }), R(500, 215, 260, 4, '#e3b55c', 2),
      ...[['ENTRÉE', 'Salade d\u2019avocat', '1 500 F', 300], ['PLAT', 'Kedjenou de poulet, attiéké', '4 500 F', 450], ['DESSERT', 'Salade de fruits', '1 000 F', 600]].flatMap(([k, a, b, y]) => [
        T(k, 500, y - 42, 28, '#e3b55c', { font: 'b' }), T(a + '  ·  ' + b, 500, y + 8, 46, '#ffffff', { font: 'b', bold: false })]),
      T('Réservation : ' + tel(d), 500, 735, 36, '#e3b55c', { font: 'b' })] }) },
    { id: 'catalogue', nom: 'Catalogue de prix', build: d => ({ v: 1, bg: { k: 'grad', c1: '#f1f5f9', c2: '#cbd5e1', angle: 180 }, objs: [
      R(500, 60, 1000, 120, '#1d4ed8', 0), T('NOS PRIX', 330, 60, 76, '#ffffff'), T(nm(d), 760, 62, 36, '#dbeafe', { font: 'b' }),
      ...[0, 1, 2, 3, 4, 5].flatMap(i => { const x = 180 + (i % 3) * 320, y = 290 + Math.floor(i / 3) * 300; return [
        R(x, y, 290, 270, '#ffffff', 20), P(x, y - 45, 250, 140, { label: 'Article ' + (i + 1), radius: 12 }), T(['Ciment 50 kg', 'Peinture 20 L', 'Tôle bac', 'Fer de 10', 'Robinet', 'Brouette'][i], x, y + 52, 30, '#0f172a', { font: 'b' }),
        R(x, y + 103, 170, 52, '#dc2626', 26), T(['5 500 F', '25 000 F', '4 000 F', '3 200 F', '6 500 F', '28 000 F'][i], x, y + 104, 30, '#ffffff', { font: 'b' })]; })] }) },
    { id: 'nouveau', nom: 'Nouveauté produit', build: d => ({ v: 1, bg: { k: 'grad', c1: '#a855f7', c2: '#4c1d95', angle: 140 }, objs: [
      P(270, 400, 420, 560, { label: 'Photo du produit', radius: 28 }), T('NOUVEAU', 720, 200, 92, '#ffd000', { r: -4, stroke: true, sc: '#4c1d95' }),
      T(d.titre || 'Nom du produit', 720, 350, 56, '#ffffff'), T(d.sous_titre || 'Disponible maintenant', 720, 430, 34, '#ede9fe', { font: 'b', bold: false }),
      C(720, 570, 190, '#ffd000'), T(d.accroche || '9 900 F', 720, 572, 46, '#4c1d95'), T(nm(d), 720, 730, 34, '#ffffff', { font: 'b' })] }) },
    { id: 'ouverture', nom: 'Ouverture / événement', build: d => ({ v: 1, bg: { k: 'grad', c1: '#fb923c', c2: '#c2410c', angle: 135 }, objs: [
      P(500, 140, 170, 170, { round: true, label: 'Logo' }), T('GRANDE\nOUVERTURE', 500, 375, 116, '#ffffff', { stroke: true, sc: '#7c2d12' }),
      R(500, 560, 600, 96, '#ffd000', 48), T('Samedi 15 novembre', 500, 562, 50, '#7c2d12', { font: 'b' }), T(nm(d) + ' · ' + (d.adresse || 'Votre quartier'), 500, 690, 36, '#ffffff', { font: 'b' })] }) },
    { id: 'service', nom: 'Service / contact', build: d => ({ v: 1, bg: { k: 'grad', c1: '#38bdf8', c2: '#075985', angle: 150 }, objs: [
      P(500, 170, 220, 220, { round: true, label: 'Logo' }), T(nm(d), 500, 370, 80, '#ffffff'), T(d.sous_titre || 'Votre slogan en une phrase', 500, 460, 40, '#e0f2fe', { font: 'b', bold: false }),
      R(500, 600, 520, 100, '#ffffff', 50), T('☎ ' + tel(d), 500, 602, 52, '#075985', { font: 'b' })] }) }
  ];

  // état de départ à partir des champs du modèle rapide
  function fromTemplate(t) {
    const col = PRESETS[t.couleur] ? t.couleur : 'jaune';
    const dark = col === 'jaune' || col === 'blanc';
    const ink = dark ? '#111111' : '#ffffff', acc = dark ? '#e10e1e' : '#ffd000';
    const objs = [
      { id: uid(), t: 'text', x: 500, y: 230, r: 0, s: 1, op: 1, text: (t.titre || 'VOTRE TITRE').toUpperCase(), font: 't', bold: true, color: ink, size: 104, stroke: false, strokeColor: dark ? '#ffffff' : '#111111', shadow: !dark, align: 'center' },
      { id: uid(), t: 'text', x: 500, y: 410, r: -4, s: 1, op: 1, text: t.accroche || '-20 %', font: 't', bold: true, color: acc, size: 170, stroke: true, strokeColor: dark ? '#ffffff' : '#111111', shadow: false, align: 'center' },
      { id: uid(), t: 'text', x: 500, y: 570, r: 0, s: 1, op: 1, text: t.sous_titre || t.commerce || 'Votre commerce', font: 'b', bold: true, color: ink, size: 46, stroke: false, strokeColor: '#111111', shadow: false, align: 'center' },
      { id: uid(), t: 'shape', kind: 'rect', x: 500, y: 680, r: 0, s: 1, op: 1, w: 360, h: 84, fill: ink, radius: 18 },
      { id: uid(), t: 'text', x: 500, y: 682, r: 0, s: 1, op: 1, text: t.cta || 'Appelez-nous', font: 'b', bold: true, color: dark ? '#ffd000' : (PRESETS[col][1]), size: 44, stroke: false, strokeColor: '#111111', shadow: false, align: 'center' }
    ];
    if (t.photo) objs.push({ id: uid(), t: 'img', x: 830, y: 400, r: 0, s: 1, op: 1, src: t.photo, w: 260, h: 260, round: true, radius: 0 });
    return { v: 1, bg: { k: 'grad', c1: PRESETS[col][0], c2: PRESETS[col][1], angle: 140 }, objs };
  }
  const bgCss = bg => bg.k === 'img' ? `center/cover no-repeat url("${bg.src}")` : bg.k === 'solid' ? bg.c1 : `linear-gradient(${bg.angle || 140}deg,${bg.c1},${bg.c2})`;

  function mount(root, initial, opts = {}) {
    let st = clone(initial && initial.objs ? initial : fromTemplate(initial || {}));
    let sel = null, drag = null, panel = 'aide';
    const undo = [], redo = [];
    const snap = () => { undo.push(JSON.stringify(st)); if (undo.length > 40) undo.shift(); redo.length = 0; };
    const changed = () => { draw(); if (opts.onChange) opts.onChange(); };
    const cur = () => st.objs.find(o => o.id === sel);
    const toast = opts.toast || (m => alert(m));

    root.innerHTML = `<div class="ze">
      <div class="ze-bar" role="toolbar" aria-label="Outils">
        <button type="button" data-z="tpl"><svg viewBox="0 0 24 24"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg><span>Modèles</span></button>
        <button type="button" data-z="text"><b>T</b><span>Texte</span></button>
        <button type="button" data-z="img"><svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg><span>Image</span></button>
        ${opts.logo ? '<button type="button" data-z="logo"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg><span>Logo</span></button>' : ''}
        <button type="button" data-z="rect"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="3"/></svg><span>Bandeau</span></button>
        <button type="button" data-z="circle"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg><span>Pastille</span></button>
        <button type="button" data-z="bg"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg><span>Fond</span></button>
        <span class="ze-sp"></span>
        <button type="button" data-z="undo" title="Annuler (Ctrl+Z)"><svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62A7.95 7.95 0 0 1 20.36 16l2.37-.78A10.5 10.5 0 0 0 12.5 8z"/></svg><span>Annuler</span></button>
        <button type="button" data-z="redo" title="Rétablir (Ctrl+Y)"><svg viewBox="0 0 24 24"><path d="M18.4 10.6A10.46 10.46 0 0 0 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16a7.95 7.95 0 0 1 12.73-3.62L13 16h9V7z"/></svg><span>Rétablir</span></button>
      </div>
      <input type="file" class="ze-file" accept="image/png,image/jpeg,image/webp" hidden>
      <input type="file" class="ze-bgfile" accept="image/*" hidden>
      <div class="ze-stage-wrap"><div class="ze-stage" tabindex="0" aria-label="Visuel 1000 × 800"><div class="ze-objs"></div><i class="ze-gx" hidden></i><i class="ze-gy" hidden></i><div class="ze-safe" aria-hidden="true"></div><span class="ze-tag">Publicité</span></div></div>
      <div class="ze-panel"></div>
    </div>`;
    const stage = root.querySelector('.ze-stage'), objsEl = root.querySelector('.ze-objs'), panelEl = root.querySelector('.ze-panel');
    const fileIn = root.querySelector('.ze-file'), bgIn = root.querySelector('.ze-bgfile');
    const gx = root.querySelector('.ze-gx'), gy = root.querySelector('.ze-gy');
    const k = () => stage.clientWidth / W;

    function objHtml(o, kk) {
      const tf = `left:${(o.x * kk).toFixed(1)}px;top:${(o.y * kk).toFixed(1)}px;opacity:${o.op ?? 1};transform:translate(-50%,-50%) rotate(${o.r}deg) scale(${o.s})`;
      let inner;
      if (o.t === 'text') {
        const stroke = o.stroke ? `-webkit-text-stroke:${(o.size * kk * 0.07).toFixed(1)}px ${o.strokeColor};paint-order:stroke fill;` : '';
        const sh = o.shadow ? `text-shadow:0 ${(o.size * kk * 0.05).toFixed(1)}px ${(o.size * kk * 0.12).toFixed(1)}px rgba(0,0,0,.45);` : '';
        inner = `<span class="ze-txt" style="font-family:${FONTS[o.font]};font-weight:${o.bold ? 800 : 500};font-size:${(o.size * kk).toFixed(2)}px;color:${o.color};text-align:${o.align || 'center'};${stroke}${sh}">${esc(o.text).replace(/\n/g, '<br>')}</span>`;
      } else if (o.t === 'img') {
        const br = o.round ? '50%' : ((o.radius || 0) * kk).toFixed(1) + 'px';
        inner = o.src ? `<img src="${o.src}" alt="" draggable="false" style="width:${(o.w * kk).toFixed(1)}px;height:${(o.h * kk).toFixed(1)}px;border-radius:${br};object-fit:cover">`
          : `<div class="ze-ph" style="width:${(o.w * kk).toFixed(1)}px;height:${(o.h * kk).toFixed(1)}px;border-radius:${br};font-size:${Math.max(9, 22 * kk).toFixed(1)}px"><span>＋ ${esc(o.label || 'Votre photo')}</span></div>`;
      }
      else inner = `<i class="ze-shape" style="width:${(o.w * kk).toFixed(1)}px;height:${(o.h * kk).toFixed(1)}px;background:${o.fill};border-radius:${o.kind === 'circle' ? '50%' : (o.radius * kk).toFixed(1) + 'px'}"></i>`;
      return `<div class="ze-o${sel === o.id ? ' sel' : ''}" data-o="${o.id}" style="${tf}">${inner}${sel === o.id ? `<i class="ze-h rot" data-h="rot" style="transform:translate(-50%,0) scale(${(1 / o.s).toFixed(3)})"></i><i class="ze-h sc" data-h="sc" style="transform:scale(${(1 / o.s).toFixed(3)})"></i>` : ''}</div>`;
    }
    function thumb(lay, w) {
      const kk = w / W;
      return `<div class="ze-mini" style="width:${w}px;height:${w * H / W}px;background:${bgCss(lay.bg)}">${lay.objs.map(o => objHtml(o, kk).replace('class="ze-o', 'class="ze-o ze-mo')).join('')}</div>`;
    }
    function draw() {
      stage.style.background = bgCss(st.bg);
      const kk = k();
      objsEl.innerHTML = st.objs.map(o => objHtml(o, kk)).join('');
    }
    function renderPanel() {
      const o = cur();
      const sw = (attr, val) => `<div class="ze-sw">${SWATCH.map(c => `<button type="button" ${attr}="${c}" style="background:${c}" class="${val === c ? 'on' : ''}" aria-label="Couleur ${c}"></button>`).join('')}<input type="color" ${attr}-pick value="${/^#[0-9a-f]{6}$/i.test(val) ? val : '#111111'}" aria-label="Autre couleur"></div>`;
      if (o) {
        let h = '';
        if (o.t === 'text') h += `<label>Texte</label><textarea class="input" data-p="text" rows="2" maxlength="120">${esc(o.text)}</textarea>
          <div class="ze-row"><div class="chips"><button type="button" data-p-font="t" class="${o.font === 't' ? 'on' : ''}">Titre</button><button type="button" data-p-font="b" class="${o.font === 'b' ? 'on' : ''}">Texte</button></div>
          <div class="chips"><button type="button" data-p-bold class="${o.bold ? 'on' : ''}"><b>G</b></button><button type="button" data-p-tog="stroke" class="${o.stroke ? 'on' : ''}">Contour</button><button type="button" data-p-tog="shadow" class="${o.shadow ? 'on' : ''}">Ombre</button></div></div>
          <label>Couleur du texte</label>${sw('data-p-color', o.color)}
          ${o.stroke ? `<label>Couleur du contour</label>${sw('data-p-stroke', o.strokeColor)}` : ''}`;
        if (o.t === 'img') h += `<div class="ze-acts" style="margin-top:0"><button type="button" class="btn sm primary" data-a="photo">${o.src ? 'Changer la photo' : 'Choisir la photo'}</button>${o.src ? '<button type="button" class="btn sm ghost" data-a="nophoto">Retirer la photo</button>' : ''}<button type="button" class="btn sm ghost" data-a="round">${o.round ? 'Cadre carré' : 'Cadre rond'}</button></div>`;
        if (o.t === 'shape') h += `<label>Couleur</label>${sw('data-p-fill', o.fill)}
          <label>Largeur <small>${Math.round(o.w)} px</small></label><input type="range" data-p-num="w" min="20" max="1000" value="${o.w}">
          ${o.kind === 'rect' ? `<label>Hauteur <small>${Math.round(o.h)} px</small></label><input type="range" data-p-num="h" min="10" max="800" value="${o.h}"><label>Arrondi <small>${o.radius} px</small></label><input type="range" data-p-num="radius" min="0" max="200" value="${o.radius}">` : ''}`;
        h += `<label>Taille <small>${Math.round(o.s * 100)} %</small></label><input type="range" data-p-num="s" min="10" max="400" value="${Math.round(o.s * 100)}">
          <label>Rotation <small>${Math.round(o.r)}°</small></label><input type="range" data-p-num="r" min="-180" max="180" value="${Math.round(o.r)}">
          <label>Opacité <small>${Math.round((o.op ?? 1) * 100)} %</small></label><input type="range" data-p-num="op" min="10" max="100" value="${Math.round((o.op ?? 1) * 100)}">
          <div class="ze-acts"><button type="button" class="btn sm ghost" data-a="center">Centrer</button><button type="button" class="btn sm ghost" data-a="front">Devant</button><button type="button" class="btn sm ghost" data-a="back">Derrière</button><button type="button" class="btn sm ghost" data-a="dup">Dupliquer</button><button type="button" class="btn sm ghost danger" data-a="del">Supprimer</button></div>`;
        panelEl.innerHTML = h;
      } else if (panel === 'modeles') {
        panelEl.innerHTML = `<label>Choisissez un modèle : tout reste modifiable ensuite</label><div class="ze-gal">${TEMPLATES.map(t => `<button type="button" data-tpl="${t.id}"><div class="ze-thumb">${thumb(t.build(opts.data || {}), 168)}</div><span>${t.nom}</span></button>`).join('')}</div>`;
      } else if (panel === 'bg') {
        const b = st.bg;
        panelEl.innerHTML = `<label>Fond en dégradé</label><div class="ze-pre">${Object.entries(PRESETS).map(([n, [a, c]]) => `<button type="button" data-bg="${n}" style="background:linear-gradient(140deg,${a},${c})" aria-label="${n}"></button>`).join('')}</div>
          <label>Vos couleurs</label><div class="ze-row"><input type="color" data-bgc="c1" value="${b.c1 || '#ffe500'}" aria-label="Couleur 1"><input type="color" data-bgc="c2" value="${b.c2 || b.c1 || '#ffd000'}" aria-label="Couleur 2">
          <div class="chips"><button type="button" data-bgk="grad" class="${b.k === 'grad' ? 'on' : ''}">Dégradé</button><button type="button" data-bgk="solid" class="${b.k === 'solid' ? 'on' : ''}">Uni</button></div></div>
          ${b.k === 'grad' ? `<label>Direction <small>${b.angle || 140}°</small></label><input type="range" data-bga min="0" max="360" value="${b.angle || 140}">` : ''}
          <div class="ze-acts"><button type="button" class="btn sm ghost" data-a="bgphoto">Photo de fond</button>${b.k === 'img' ? '<button type="button" class="btn sm ghost" data-bgk="grad">Retirer la photo</button>' : ''}</div>`;
      } else panelEl.innerHTML = `<p class="ze-help">Touchez un élément pour le modifier. Faites-le glisser pour le déplacer : il s'aimante au centre. La poignée du haut le fait tourner, celle du coin l'agrandit. Au clavier : flèches pour ajuster, Suppr pour retirer, Ctrl+D pour dupliquer.</p>`;
    }
    const select = id => { sel = id; panel = id ? 'obj' : panel === 'bg' ? 'bg' : 'aide'; draw(); renderPanel(); };
    const add = o => { snap(); st.objs.push(o); select(o.id); changed(); };

    // ---------- gestes sur la scène ----------
    const pos = e => { const r = stage.getBoundingClientRect(), kk = r.width / W; return [(e.clientX - r.left) / kk, (e.clientY - r.top) / kk]; };
    stage.addEventListener('pointerdown', e => {
      const el = e.target.closest('.ze-o'), h = e.target.closest('.ze-h');
      if (!el) { if (sel) { sel = null; panel = 'aide'; draw(); renderPanel(); } return; }
      const o = st.objs.find(x => x.id === el.dataset.o); if (!o) return;
      e.preventDefault(); stage.focus({ preventScroll: true });
      if (sel !== o.id) select(o.id);
      const [px, py] = pos(e);
      snap();
      drag = { o, mode: h ? h.dataset.h : 'move', px, py, x0: o.x, y0: o.y, s0: o.s, r0: o.r, d0: Math.hypot(px - o.x, py - o.y) || 1, a0: Math.atan2(py - o.y, px - o.x), id: e.pointerId, moved: false };
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag, o = d.o, [px, py] = pos(e);
      d.moved = true;
      if (d.mode === 'move') {
        let x = d.x0 + px - d.px, y = d.y0 + py - d.py;
        const sx = Math.abs(x - W / 2) < 10, sy = Math.abs(y - H / 2) < 10;
        if (sx) x = W / 2; if (sy) y = H / 2;
        gx.hidden = !sx; gy.hidden = !sy;
        o.x = Math.max(-200, Math.min(W + 200, x)); o.y = Math.max(-200, Math.min(H + 200, y));
      } else if (d.mode === 'sc') o.s = Math.max(0.1, Math.min(4, d.s0 * Math.hypot(px - o.x, py - o.y) / d.d0));
      else if (d.mode === 'rot') { let r = d.r0 + (Math.atan2(py - o.y, px - o.x) - d.a0) * 180 / Math.PI; r = ((r + 540) % 360) - 180; if (Math.abs(r) < 4) r = 0; o.r = r; }
      draw();
    });
    const end = () => { if (!drag) return; if (!drag.moved) undo.pop(); drag = null; gx.hidden = gy.hidden = true; renderPanel(); if (opts.onChange) opts.onChange(); };
    stage.addEventListener('dblclick', e => { const el = e.target.closest('.ze-o'); const o = el && st.objs.find(x => x.id === el.dataset.o); if (o && o.t === 'img') { photoTarget = o.id; fileIn.click(); } });
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('keydown', e => {
      const o = cur();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); act(e.shiftKey ? 'redo' : 'undo'); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); act('redo'); return; }
      if (!o) return;
      const step = e.shiftKey ? 10 : 2;
      const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (mv) { e.preventDefault(); snap(); o.x += mv[0]; o.y += mv[1]; changed(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act('del'); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); act('dup'); }
    });
    new ResizeObserver(() => draw()).observe(stage);

    // ---------- outils ----------
    function act(a) {
      const o = cur();
      if (a === 'undo' && undo.length) { redo.push(JSON.stringify(st)); st = JSON.parse(undo.pop()); if (!cur()) sel = null; renderPanel(); changed(); }
      else if (a === 'redo' && redo.length) { undo.push(JSON.stringify(st)); st = JSON.parse(redo.pop()); if (!cur()) sel = null; renderPanel(); changed(); }
      else if (!o && a !== 'bgphoto') return;
      else if (a === 'del') { snap(); st.objs = st.objs.filter(x => x !== o); sel = null; panel = 'aide'; renderPanel(); changed(); }
      else if (a === 'dup') { const n = { ...clone(o), id: uid(), x: o.x + 30, y: o.y + 30 }; add(n); }
      else if (a === 'front') { snap(); st.objs = st.objs.filter(x => x !== o).concat(o); changed(); }
      else if (a === 'back') { snap(); st.objs = [o].concat(st.objs.filter(x => x !== o)); changed(); }
      else if (a === 'center') { snap(); o.x = W / 2; o.y = H / 2; changed(); }
      else if (a === 'bgphoto') bgIn.click();
      else if (a === 'photo') { photoTarget = o.id; fileIn.click(); }
      else if (a === 'nophoto') { snap(); o.src = null; renderPanel(); changed(); }
      else if (a === 'round') { snap(); o.round = !o.round; if (o.round) o.h = o.w = Math.min(o.w, o.h); renderPanel(); changed(); }
    }
    async function addImage(src, maxSide = 420) {
      const im = await loadImg(src);
      const kk = Math.min(1, 900 / Math.max(im.width, im.height));
      if (kk < 1 || src.length > 700000) { const c = document.createElement('canvas'); c.width = Math.round(im.width * kk); c.height = Math.round(im.height * kk); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); src = /png|webp/.test(src.slice(0, 30)) ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.86); }
      const f = Math.min(1, maxSide / Math.max(im.width * kk, im.height * kk));
      add({ id: uid(), t: 'img', x: 500, y: 400, r: 0, s: 1, op: 1, src, w: Math.round(im.width * kk * f), h: Math.round(im.height * kk * f), radius: 0 });
    }
    root.querySelector('.ze-bar').addEventListener('click', async e => {
      const b = e.target.closest('[data-z]'); if (!b) return;
      const z = b.dataset.z;
      if (z === 'text') { add({ id: uid(), t: 'text', x: 500, y: 400, r: 0, s: 1, op: 1, text: 'Votre texte', font: 'b', bold: true, color: '#111111', size: 64, stroke: false, strokeColor: '#ffffff', shadow: false, align: 'center' }); setTimeout(() => { const ta = panelEl.querySelector('[data-p="text"]'); if (ta) { ta.focus(); ta.select(); } }, 30); }
      else if (z === 'img') fileIn.click();
      else if (z === 'logo' && opts.logo) addImage(opts.logo, 220);
      else if (z === 'rect') add({ id: uid(), t: 'shape', kind: 'rect', x: 500, y: 400, r: 0, s: 1, op: 1, w: 420, h: 110, fill: '#e10e1e', radius: 20 });
      else if (z === 'circle') add({ id: uid(), t: 'shape', kind: 'circle', x: 760, y: 420, r: 0, s: 1, op: 1, w: 220, h: 220, fill: '#ffd000', radius: 0 });
      else if (z === 'bg') { sel = null; panel = panel === 'bg' ? 'aide' : 'bg'; draw(); renderPanel(); }
      else if (z === 'tpl') { sel = null; panel = panel === 'modeles' ? 'aide' : 'modeles'; draw(); renderPanel(); }
      else act(z);
    });
    let photoTarget = null;
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files[0]; fileIn.value = ''; const tgt = photoTarget; photoTarget = null; if (!f) return;
      try {
        const src = await readFile(f), o = tgt && st.objs.find(x => x.id === tgt);
        if (o) { // le cadre garde sa taille : la photo est recadrée dedans
          const im = await loadImg(src), c = document.createElement('canvas'), ow = Math.round(o.w * 1.5), oh = Math.round(o.h * 1.5);
          c.width = ow; c.height = oh; const kk = Math.max(ow / im.width, oh / im.height);
          c.getContext('2d').drawImage(im, (ow - im.width * kk) / 2, (oh - im.height * kk) / 2, im.width * kk, im.height * kk);
          snap(); o.src = /png|webp/.test(src.slice(0, 30)) ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.86); renderPanel(); changed();
        } else await addImage(src);
      } catch (_) { toast('Image illisible.'); }
    });
    bgIn.addEventListener('change', async () => {
      const f = bgIn.files[0]; bgIn.value = ''; if (!f) return;
      try {
        const im = await loadImg(await readFile(f)); const c = document.createElement('canvas'); c.width = W; c.height = H;
        const kk = Math.max(W / im.width, H / im.height); c.getContext('2d').drawImage(im, (W - im.width * kk) / 2, (H - im.height * kk) / 2, im.width * kk, im.height * kk);
        snap(); st.bg = { ...st.bg, k: 'img', src: c.toDataURL('image/jpeg', 0.84) }; renderPanel(); changed();
      } catch (_) { toast('Image illisible.'); }
    });
    // panneau de propriétés
    panelEl.addEventListener('input', e => {
      const t = e.target, o = cur();
      if (t.dataset.p === 'text' && o) { o.text = t.value; changed(); return; }
      if (t.dataset.pNum && o) {
        const key = t.dataset.pNum; let v = +t.value;
        if (key === 's' || key === 'op') v /= 100;
        o[key] = v; if (key === 'w' && o.kind === 'circle') o.h = v;
        const sm = t.previousElementSibling && t.previousElementSibling.querySelector('small');
        if (sm) sm.textContent = key === 'r' ? `${v}°` : key === 's' || key === 'op' ? `${Math.round(v * 100)} %` : `${v} px`;
        changed(); return;
      }
      if (t.matches('[data-p-color-pick]') && o) { o.color = t.value; changed(); return; }
      if (t.matches('[data-p-stroke-pick]') && o) { o.strokeColor = t.value; changed(); return; }
      if (t.matches('[data-p-fill-pick]') && o) { o.fill = t.value; changed(); return; }
      if (t.dataset.bgc) { st.bg[t.dataset.bgc] = t.value; if (st.bg.k === 'img') st.bg.k = 'grad'; if (!st.bg.c2) st.bg.c2 = st.bg.c1; changed(); return; }
      if (t.hasAttribute('data-bga')) { st.bg.angle = +t.value; t.previousElementSibling.querySelector('small').textContent = t.value + '°'; changed(); }
    });
    panelEl.addEventListener('focusin', e => { if (e.target.matches('input,textarea')) snap(); });
    panelEl.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return; const o = cur();
      if (t.dataset.tpl) {
        const tp = TEMPLATES.find(x => x.id === t.dataset.tpl); if (!tp) return;
        if (st.objs.length && undo.length && !confirm('Remplacer le visuel actuel par ce modèle ? (Annuler permet de revenir en arrière.)')) return;
        snap(); st = tp.build(opts.data || {}); sel = null; panel = 'aide'; renderPanel(); changed(); return;
      }
      if (t.dataset.a) { act(t.dataset.a); return; }
      if (t.dataset.bg) { snap(); const [a, c] = PRESETS[t.dataset.bg]; st.bg = { k: 'grad', c1: a, c2: c, angle: st.bg.angle || 140 }; renderPanel(); changed(); return; }
      if (t.dataset.bgk) { snap(); st.bg = { k: t.dataset.bgk, c1: st.bg.c1 || '#ffe500', c2: st.bg.c2 || '#ffd000', angle: st.bg.angle || 140 }; renderPanel(); changed(); return; }
      if (!o) return;
      snap();
      if (t.dataset.pFont) o.font = t.dataset.pFont;
      else if (t.hasAttribute('data-p-bold')) o.bold = !o.bold;
      else if (t.dataset.pTog) o[t.dataset.pTog] = !o[t.dataset.pTog];
      else if (t.dataset.pColor) o.color = t.dataset.pColor;
      else if (t.dataset.pStroke) o.strokeColor = t.dataset.pStroke;
      else if (t.dataset.pFill) o.fill = t.dataset.pFill;
      else { undo.pop(); return; }
      renderPanel(); changed();
    });

    // ---------- export JPEG 1000 × 800 ----------
    async function exportJpeg(maxChars = 650000) {
      const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      const b = st.bg;
      if (b.k === 'img') { const im = await loadImg(b.src); x.drawImage(im, 0, 0, W, H); }
      else if (b.k === 'solid') { x.fillStyle = b.c1; x.fillRect(0, 0, W, H); }
      else {
        const a = ((b.angle || 140) - 90) * Math.PI / 180, L = Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a));
        const g = x.createLinearGradient(W / 2 - Math.cos(a) * L / 2, H / 2 - Math.sin(a) * L / 2, W / 2 + Math.cos(a) * L / 2, H / 2 + Math.sin(a) * L / 2);
        g.addColorStop(0, b.c1); g.addColorStop(1, b.c2 || b.c1); x.fillStyle = g; x.fillRect(0, 0, W, H);
      }
      try { await Promise.all([document.fonts.load(`800 80px ${FONTS.t}`), document.fonts.load(`800 40px ${FONTS.b}`), document.fonts.load(`500 40px ${FONTS.b}`)]); } catch (_) {}
      for (const o of st.objs) {
        x.save(); x.globalAlpha = o.op ?? 1; x.translate(o.x, o.y); x.rotate(o.r * Math.PI / 180); x.scale(o.s, o.s);
        if (o.t === 'text') {
          x.font = `${o.bold ? 800 : 500} ${o.size}px ${FONTS[o.font]}`; x.textBaseline = 'middle';
          x.textAlign = o.align === 'left' ? 'left' : o.align === 'right' ? 'right' : 'center';
          const lines = String(o.text).split('\n'), lh = o.size * 1.12;
          const wmax = Math.max(...lines.map(l => x.measureText(l).width)), ox = o.align === 'left' ? -wmax / 2 : o.align === 'right' ? wmax / 2 : 0;
          lines.forEach((ln, i) => {
            const y = (i - (lines.length - 1) / 2) * lh;
            if (o.shadow) { x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = o.size * 0.12; x.shadowOffsetY = o.size * 0.05; }
            if (o.stroke) { x.lineJoin = 'round'; x.lineWidth = o.size * 0.14; x.strokeStyle = o.strokeColor; x.strokeText(ln, ox, y); x.shadowColor = 'transparent'; }
            x.fillStyle = o.color; x.fillText(ln, ox, y); x.shadowColor = 'transparent';
          });
        } else if (o.t === 'img') {
          if (o.src) {
            const im = await loadImg(o.src);
            x.save(); x.beginPath();
            if (o.round) x.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
            else { const r = Math.min(o.radius || 0, o.w / 2, o.h / 2), w2 = o.w / 2, h2 = o.h / 2; x.moveTo(-w2 + r, -h2); x.arcTo(w2, -h2, w2, h2, r); x.arcTo(w2, h2, -w2, h2, r); x.arcTo(-w2, h2, -w2, -h2, r); x.arcTo(-w2, -h2, w2, -h2, r); x.closePath(); }
            x.clip();
            const kk = Math.max(o.w / im.width, o.h / im.height); x.drawImage(im, -im.width * kk / 2, -im.height * kk / 2, im.width * kk, im.height * kk);
            x.restore();
          }
        }
        else {
          x.fillStyle = o.fill; x.beginPath();
          if (o.kind === 'circle') x.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
          else { const r = Math.min(o.radius, o.w / 2, o.h / 2), w2 = o.w / 2, h2 = o.h / 2; x.moveTo(-w2 + r, -h2); x.arcTo(w2, -h2, w2, h2, r); x.arcTo(w2, h2, -w2, h2, r); x.arcTo(-w2, h2, -w2, -h2, r); x.arcTo(-w2, -h2, w2, -h2, r); x.closePath(); }
          x.fill();
        }
        x.restore();
      }
      let q = 0.88, out = c.toDataURL('image/jpeg', q);
      while (out.length > maxChars && q > 0.45) { q -= 0.07; out = c.toDataURL('image/jpeg', q); }
      return out;
    }
    if (opts.gallery) panel = 'modeles';
    draw(); renderPanel();
    return { empties: () => st.objs.filter(o => o.t === 'img' && !o.src).length, get: () => clone(st), export: exportJpeg, setBgImage: src => { snap(); st.bg = { ...st.bg, k: 'img', src }; changed(); } };
  }
  window.ZPEditor = { mount, fromTemplate, templates: TEMPLATES.map(t => ({ id: t.id, nom: t.nom })) };
})();
