/* ==========================================================================
   ZUPA — Paiya : hôtels, restaurants, toilettes publiques, commerces (OpenStreetMap)
   (sans DOM : utilisé par l'application et par scripts/fetch-pharmacies.mjs)
   ========================================================================== */
const PaiyaCore = (() => {
  'use strict';

  const CATS = {
    resto: { label: 'Restos', one: 'Restaurant', osm: [['amenity', '^(restaurant|fast_food|cafe|food_court|ice_cream)$']] },
    maquis: { label: 'Maquis & bars', one: 'Maquis', osm: [['amenity', '^(bar|pub|nightclub|biergarten)$']] },
    hotel: { label: 'Hôtels', one: 'Hôtel', osm: [['tourism', '^(hotel|guest_house|motel|hostel|apartment)$']] },
    wc: { label: 'Toilettes', one: 'Toilettes publiques', osm: [['amenity', '^toilets$']] },
    station: { label: 'Stations', one: 'Station-service', osm: [['amenity', '^fuel$']] },
    shop: { label: 'Commerces', one: 'Commerce', osm: [['shop', '.']] },
    supermarche: { label: 'Supermarchés', one: 'Supermarché', osm: [] },     // shop=supermarket, déjà couvert par « shop »
    marche: { label: 'Marchés', one: 'Marché', osm: [['amenity', '^marketplace$']] },
    culte: { label: 'Lieux de culte', one: 'Lieu de culte', osm: [['amenity', '^place_of_worship$']] },
    sante: { label: 'Cliniques', one: 'Clinique', osm: [['amenity', '^(clinic|hospital|doctors)$']] }   // affichées dans l'onglet Pharmacies
  };
  const ORDER = ['resto', 'maquis', 'hotel', 'wc', 'station', 'shop', 'supermarche', 'marche', 'culte'];
  // catégories jamais comptées dans « les plus visités » (santé et religion : données sensibles)
  const SENSITIVE = new Set(['sante', 'culte']);

  // Grand Abidjan (données intégrées à l'application)
  const BBOX = [5.15, -4.30, 5.62, -3.70];

  const sel = (scope) => Object.keys(CATS).flatMap(c => CATS[c].osm.flatMap(([k, v]) => {
    const named = c === 'wc' || c === 'marche' ? '' : '["name"]';
    return [`node["${k}"~"${v}"]${named}${scope};`, `way["${k}"~"${v}"]${named}${scope};`];
  })).join('\n');
  const queryBBox = (bbox = BBOX) => `[out:json][timeout:180];\n(\n${sel(`(${bbox.join(',')})`)}\n);\nout center tags;`;
  const queryAround = (lat, lon, m = 3000) => `[out:json][timeout:40];\n(\n${sel(`(around:${m},${lat},${lon})`)}\n);\nout center tags;`;

  const CUISINE = { african: 'africaine', ivorian: 'ivoirienne', local: 'locale', regional: 'locale', lebanese: 'libanaise', pizza: 'pizza',
    burger: 'burgers', chicken: 'poulet', chinese: 'chinoise', french: 'française', italian: 'italienne', seafood: 'fruits de mer',
    fish: 'poisson', grill: 'grillades', barbecue: 'grillades', sandwich: 'sandwichs', coffee_shop: 'café', indian: 'indienne',
    japanese: 'japonaise', sushi: 'sushis', international: 'internationale', moroccan: 'marocaine', senegalese: 'sénégalaise',
    vietnamese: 'vietnamienne', thai: 'thaïlandaise', turkish: 'turque', kebab: 'kebab', ice_cream: 'glaces', pastry: 'pâtisserie' };
  const AMENITY = { restaurant: 'Restaurant', fast_food: 'Restauration rapide', cafe: 'Café', food_court: 'Espace restauration', ice_cream: 'Glacier' };
  const TOURISM = { hotel: 'Hôtel', guest_house: "Maison d'hôtes", motel: 'Motel', hostel: 'Auberge', apartment: 'Résidence meublée' };
  const SHOP = { supermarket: 'Supermarché', convenience: 'Supérette', mall: 'Centre commercial', department_store: 'Grand magasin',
    clothes: 'Vêtements', shoes: 'Chaussures', bakery: 'Boulangerie', pastry: 'Pâtisserie', butcher: 'Boucherie', mobile_phone: 'Téléphonie',
    electronics: 'Électronique', computer: 'Informatique', hardware: 'Quincaillerie', doityourself: 'Bricolage', hairdresser: 'Coiffure',
    beauty: 'Beauté', cosmetics: 'Cosmétiques', car: 'Automobiles', car_repair: 'Garage', car_parts: 'Pièces auto', tyres: 'Pneus',
    motorcycle: 'Motos', furniture: 'Meubles', books: 'Librairie', stationery: 'Papeterie', optician: 'Opticien', jewelry: 'Bijouterie',
    gift: 'Cadeaux', sports: 'Sport', alcohol: 'Boissons', beverages: 'Boissons', greengrocer: 'Fruits et légumes', kiosk: 'Kiosque',
    tailor: 'Couture', fabric: 'Tissus', bag: 'Maroquinerie', copyshop: 'Photocopie', laundry: 'Pressing', dry_cleaning: 'Pressing',
    variety_store: 'Bazar', general: 'Commerce général', wholesale: 'Grossiste', florist: 'Fleuriste', pet: 'Animalerie', toys: 'Jouets',
    baby_goods: 'Puériculture', medical_supply: 'Matériel médical', chemist: 'Droguerie', boutique: 'Boutique', music: 'Musique',
    bicycle: 'Vélos', gas: 'Gaz', fuel: 'Carburant', travel_agency: 'Agence de voyages', money_lender: 'Prêt', e_cigarette: 'Cigarette électronique' };

  const catOf = t => {
    const a = t.amenity || '';
    if (/^(hotel|guest_house|motel|hostel|apartment)$/.test(t.tourism || '')) return 'hotel';
    if (/^(bar|pub|nightclub|biergarten)$/.test(a)) return 'maquis';
    if (/^(restaurant|fast_food|cafe|food_court|ice_cream)$/.test(a)) return /\bmaquis\b/i.test(t.name || '') ? 'maquis' : 'resto';
    if (a === 'toilets') return 'wc';
    if (a === 'fuel') return 'station';
    if (a === 'marketplace') return 'marche';
    if (a === 'place_of_worship') return 'culte';
    if (/^(clinic|hospital|doctors)$/.test(a)) return 'sante';
    if (/^(supermarket|hypermarket)$/.test(t.shop || '')) return 'supermarche';
    return t.shop ? 'shop' : null;
  };

  function subLabel(c, t) {
    if (c === 'hotel') { const s = parseInt(t.stars, 10); return (TOURISM[t.tourism] || 'Hôtel') + (s > 0 && s < 8 ? ' ' + '★'.repeat(s) : ''); }
    if (c === 'resto') {
      const cu = String(t.cuisine || '').split(/[;,]/).map(x => CUISINE[x.trim()]).filter(Boolean);
      return (AMENITY[t.amenity] || 'Restaurant') + (cu.length ? ' · ' + cu.slice(0, 2).join(', ') : '');
    }
    if (c === 'wc') {
      const fee = t.fee === 'yes' ? 'payantes' : t.fee === 'no' ? 'gratuites' : '';
      return ['Toilettes', fee, t.wheelchair === 'yes' ? 'accessibles' : ''].filter(Boolean).join(' · ');
    }
    if (c === 'maquis') return /\bmaquis\b/i.test(t.name || '') && t.amenity !== 'nightclub' ? 'Maquis' : ({ bar: 'Bar', pub: 'Bar', nightclub: 'Boîte de nuit', biergarten: 'Maquis' }[t.amenity] || 'Maquis');
    if (c === 'station') return 'Station-service' + (t.brand ? ' · ' + t.brand : '');
    if (c === 'supermarche') return 'Supermarché';
    if (c === 'marche') return 'Marché';
    if (c === 'culte') {
      const r = t.religion, d = String(t.denomination || '');
      if (r === 'muslim') return 'Mosquée';
      if (r === 'christian') return /catholic/.test(d) ? 'Église catholique' : /methodist/.test(d) ? 'Église méthodiste' : /evangelical|pentecostal|baptist|protestant|assemblies/.test(d) ? 'Église évangélique' : 'Église';
      return 'Lieu de culte';
    }
    if (c === 'sante') return { clinic: 'Clinique', hospital: 'Hôpital', doctors: 'Cabinet médical' }[t.amenity] || 'Clinique';
    return SHOP[t.shop] || 'Commerce';
  }

  function fromOsm(json) {
    const out = [];
    for (const e of (json && json.elements) || []) {
      const lat = e.lat ?? (e.center && e.center.lat), lon = e.lon ?? (e.center && e.center.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const t = e.tags || {};
      if (t.disused || t.abandoned || t['disused:shop'] || t.access === 'private' || (t.access === 'customers' && t.amenity === 'toilets')) continue;
      const c = catOf(t);
      if (!c) continue;
      const name = (t.name || t['name:fr'] || t.brand || '').trim().replace(/\s+/g, ' ') || CATS[c].one;
      const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
      const o = { id: e.type[0] + e.id, cat: c, name, sub: subLabel(c, t), lat: +lat.toFixed(6), lon: +lon.toFixed(6) };
      const phone = (t.phone || t['contact:phone'] || t['contact:mobile'] || '').trim(); if (phone) o.phone = phone;
      if (street || t['addr:place']) o.street = street || t['addr:place'];
      const city = t['addr:city'] || t['addr:suburb']; if (city) o.commune = city;
      if (t.opening_hours) o.hours = t.opening_hours.trim();
      const web = t.website || t['contact:website'] || t['contact:facebook']; if (web) o.web = web.trim();
      out.push(o);
    }
    return out;
  }

  return { CATS, ORDER, SENSITIVE, BBOX, queryBBox, queryAround, fromOsm };
})();
if (typeof module !== 'undefined') module.exports = PaiyaCore;
