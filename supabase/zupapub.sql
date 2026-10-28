-- =====================================================================
-- ZUPA PUB — plateforme web des annonceurs (panneaux publicitaires virtuels géolocalisés)
-- À exécuter une fois dans Supabase › SQL Editor (ré-exécutable sans risque).
--
-- Panneaux :
--   Géopub@siège   : sur le point de vente. Zone A (200 m) : ses pubs uniquement ;
--                    zone B (500 m) : avec les autres, affichage 3 × plus long ;
--                    zone C (toute la ville ou tout le pays) : affichage normal.
--   Géopub@city    : emplacement supplémentaire (itinéraire, autre point de vente) : 100 m, affichage 2 × plus long.
-- Tarifs : siège 25 000 F / mois ; emplacement 15 000 F / semaine ; pack 5 emplacements 60 000 F / semaine.
-- Paiement : solde du compte annonceur. DÉMO : crédit offert et recharge gratuite ; Mobile Money plus tard.
-- Sécurité : chaque annonceur (compte Supabase Auth) ne voit et ne modifie que ses données ;
-- l'application ne reçoit que les campagnes en ligne, sans aucune donnée personnelle de l'annonceur
-- en dehors de ce qu'il publie (nom du commerce, téléphone, position du point de vente).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- réglages ----------
create table if not exists public.zp_config (cle text primary key, valeur text not null);
insert into public.zp_config (cle, valeur) values
  ('demo', 'oui'),                 -- 'non' : les nouvelles campagnes attendent une validation
  ('credit_initial', '200000'),     -- crédit offert à l'ouverture du compte (démo)
  ('recharge_demo', '100000')       -- montant d'une recharge gratuite (démo)
on conflict (cle) do nothing;

create table if not exists public.zp_tarifs (
  code    text primary key,
  libelle text not null,
  prix    int  not null check (prix >= 0),
  unite   text not null check (unite in ('mois', 'semaine')),
  places  int  not null default 1
);
insert into public.zp_tarifs (code, libelle, prix, unite, places) values
  ('siege', 'Géopub@siège — point de vente', 25000, 'mois', 1),
  ('city',  'Géopub@city — emplacement supplémentaire', 15000, 'semaine', 1),
  ('pack5', 'Pack 5 emplacements — réseau de commerces', 60000, 'semaine', 5)
on conflict (code) do nothing;

-- ---------- annonceurs ----------
create table if not exists public.zp_annonceurs (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  nom         text not null check (char_length(btrim(nom)) between 2 and 60),
  cat         text not null default 'shop' check (cat in ('resto', 'maquis', 'shop', 'supermarche', 'marche', 'hotel', 'station', 'pharma', 'sante', 'service', 'autre')),
  tel         text check (tel ~ '^[0-9]{8,12}$'),
  whatsapp    boolean not null default true,
  email       text,
  adresse     text check (char_length(adresse) <= 120),
  description text check (char_length(description) <= 400),
  logo        text check (logo is null or (char_length(logo) < 200000 and logo ~ '^data:image/(png|jpeg|webp);base64,')),
  solde       int  not null default 0 check (solde >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.zp_mouvements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  montant     int  not null,
  type        text not null check (type in ('credit_demo', 'recharge_demo', 'mobile_money', 'achat', 'remboursement')),
  libelle     text not null,
  campagne_id uuid,
  created_at  timestamptz not null default now()
);
create index if not exists zp_mouvements_user on public.zp_mouvements (user_id, created_at desc);

-- ---------- campagnes et panneaux ----------
create table if not exists public.zp_campagnes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  nom         text not null check (char_length(btrim(nom)) between 2 and 60),
  statut      text not null default 'active' check (statut in ('a_valider', 'active', 'pause', 'refusee')),
  portee      text not null default 'ville' check (portee in ('ville', 'pays')),
  siege_nom   text not null check (char_length(btrim(siege_nom)) between 2 and 80),
  siege_lat   double precision not null check (siege_lat between 4 and 11),
  siege_lon   double precision not null check (siege_lon between -9 and -2),
  modele      text not null default 'promo' check (modele in ('promo', 'produit', 'resto', 'service', 'visuel')),
  titre       text check (titre is null or char_length(titre) <= 40),
  sous_titre  text check (sous_titre is null or char_length(sous_titre) <= 60),
  accroche    text check (accroche is null or char_length(accroche) <= 14),
  cta         text not null default 'appel' check (cta in ('appel', 'whatsapp', 'itineraire')),
  couleur     text not null default 'jaune' check (couleur in ('jaune', 'orange', 'rouge', 'vert', 'bleu', 'violet', 'noir')),
  image       text check (image is null or (char_length(image) < 700000 and image ~ '^data:image/(png|jpeg|webp);base64,')),
  debut       date not null default current_date,
  fin         date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists zp_campagnes_user on public.zp_campagnes (user_id);
create index if not exists zp_campagnes_actives on public.zp_campagnes (fin) where statut = 'active';

create sequence if not exists public.zp_panneau_seq;
create table if not exists public.zp_panneaux (
  id          uuid primary key default gen_random_uuid(),
  campagne_id uuid not null references public.zp_campagnes (id) on delete cascade,
  code        text not null unique,
  type        text not null check (type in ('siege', 'city')),
  nom         text check (nom is null or char_length(nom) <= 80),
  lat         double precision not null check (lat between 4 and 11),
  lon         double precision not null check (lon between -9 and -2),
  debut       date not null default current_date,
  fin         date not null,
  created_at  timestamptz not null default now()
);
create index if not exists zp_panneaux_campagne on public.zp_panneaux (campagne_id);

-- ---------- établissements (un annonceur peut en avoir plusieurs : quincaillerie, boulangerie…) ----------
create table if not exists public.zp_etablissements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  nom         text not null check (char_length(btrim(nom)) between 2 and 60),
  cat         text not null default 'shop' check (cat in ('resto', 'maquis', 'shop', 'supermarche', 'marche', 'hotel', 'station', 'pharma', 'sante', 'service', 'autre')),
  tel         text check (tel ~ '^[0-9]{8,12}$'),
  whatsapp    boolean not null default true,
  adresse     text check (char_length(adresse) <= 120),
  logo        text check (logo is null or (char_length(logo) < 200000 and logo ~ '^data:image/(png|jpeg|webp);base64,')),
  lat         double precision check (lat between 4 and 11),
  lon         double precision check (lon between -9 and -2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists zp_etablissements_user on public.zp_etablissements (user_id);
alter table public.zp_campagnes add column if not exists etablissement_id uuid references public.zp_etablissements (id) on delete set null;
alter table public.zp_campagnes add column if not exists layout jsonb;
alter table public.zp_campagnes drop constraint if exists zp_campagnes_layout_check;
alter table public.zp_campagnes add constraint zp_campagnes_layout_check check (layout is null or (jsonb_typeof(layout) = 'object' and octet_length(layout::text) < 2500000));
-- comptes créés avant les établissements : un premier établissement à partir du profil
insert into public.zp_etablissements (user_id, nom, cat, tel, whatsapp, adresse, logo)
select a.user_id, a.nom, a.cat, a.tel, a.whatsapp, a.adresse, a.logo from public.zp_annonceurs a
where not exists (select 1 from public.zp_etablissements e where e.user_id = a.user_id);
update public.zp_campagnes c set etablissement_id = (select e.id from public.zp_etablissements e where e.user_id = c.user_id order by e.created_at limit 1)
where c.etablissement_id is null;

create table if not exists public.zp_stats (
  campagne_id uuid not null references public.zp_campagnes (id) on delete cascade,
  jour        date not null default current_date,
  vues        int not null default 0,
  touchers    int not null default 0,
  appels      int not null default 0,
  itineraires int not null default 0,
  visites     int not null default 0,
  primary key (campagne_id, jour)
);

-- tout passe par les fonctions ci-dessous : aucun accès direct aux tables
do $$
declare t text;
begin
  foreach t in array array['zp_config', 'zp_tarifs', 'zp_annonceurs', 'zp_etablissements', 'zp_mouvements', 'zp_campagnes', 'zp_panneaux', 'zp_stats'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
grant select on public.zp_tarifs to anon, authenticated;
drop policy if exists zp_tarifs_lecture on public.zp_tarifs;
create policy zp_tarifs_lecture on public.zp_tarifs for select to anon, authenticated using (true);

-- ---------- outils ----------
create or replace function public.zp_cfg(k text) returns text
language sql stable security definer set search_path = public as $$ select valeur from zp_config where cle = k $$;

create or replace function public.zp_uid() returns uuid
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '28000'; end if;
  return auth.uid();
end $$;

-- prix des emplacements supplémentaires : par 5 au tarif pack quand c'est moins cher
create or replace function public.zp_prix_city(n int, semaines int) returns int
language sql stable security definer set search_path = public as $$
  select case when n <= 0 or semaines <= 0 then 0 else
    semaines * least(n * (select prix from zp_tarifs where code = 'city'),
      (n / 5) * (select prix from zp_tarifs where code = 'pack5') + (n % 5) * (select prix from zp_tarifs where code = 'city')) end
$$;

create or replace function public.zp_devis(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare mois int := greatest(1, least(12, coalesce((p->>'mois')::int, 1)));
  n int := coalesce(jsonb_array_length(case when jsonb_typeof(p->'panneaux') = 'array' then p->'panneaux' else '[]'::jsonb end), 0);
  sem int := greatest(1, least(52, coalesce((p->>'semaines')::int, 1)));
  ps int; pc int;
begin
  ps := case when coalesce((p->>'sans_siege')::boolean, false) then 0 else mois * (select prix from zp_tarifs where code = 'siege') end;
  pc := zp_prix_city(n, sem);
  return jsonb_build_object('siege', ps, 'mois', mois, 'emplacements', n, 'semaines', sem, 'city', pc,
    'packs', n / 5, 'total', ps + pc);
end $$;

create or replace function public.zp_code(t text) returns text
language sql volatile security definer set search_path = public as $$
  select case when t = 'siege' then 'GP-S-' else 'GP-C-' end || lpad(nextval('zp_panneau_seq')::text, 5, '0')
$$;

-- ---------- compte annonceur ----------
create or replace function public.zp_moi() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := zp_uid(); a zp_annonceurs;
begin
  select * into a from zp_annonceurs where user_id = u;
  return jsonb_build_object(
    'profil', case when a.user_id is null then null else to_jsonb(a) - 'user_id' end,
    'etablissements', (select coalesce(jsonb_agg(to_jsonb(e) - 'user_id' order by e.created_at), '[]'::jsonb) from zp_etablissements e where e.user_id = u),
    'demo', zp_cfg('demo') = 'oui',
    'recharge_demo', zp_cfg('recharge_demo')::int,
    'tarifs', (select jsonb_agg(to_jsonb(t) order by t.prix) from zp_tarifs t));
end $$;

create or replace function public.zp_etab_enregistrer(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := zp_uid(); eid uuid := nullif(p->>'id', '')::uuid; v_tel text;
begin
  v_tel := nullif(regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g'), '');
  if v_tel is not null and v_tel ~ '^225[0-9]{10}$' then v_tel := substr(v_tel, 4); end if;
  if eid is null then
    if (select count(*) from zp_etablissements where user_id = u) >= 30 then raise exception '30 établissements au maximum' using errcode = 'P0001'; end if;
    insert into zp_etablissements (user_id, nom, cat, tel, whatsapp, adresse, logo, lat, lon)
    values (u, btrim(p->>'nom'), coalesce(nullif(p->>'cat', ''), 'shop'), v_tel, coalesce((p->>'whatsapp')::boolean, true), nullif(btrim(p->>'adresse'), ''),
      nullif(p->>'logo', ''), (p->>'lat')::float8, (p->>'lon')::float8)
    returning id into eid;
  else
    update zp_etablissements set nom = btrim(p->>'nom'), cat = coalesce(nullif(p->>'cat', ''), cat), tel = v_tel, whatsapp = coalesce((p->>'whatsapp')::boolean, whatsapp),
      adresse = nullif(btrim(p->>'adresse'), ''), logo = case when p ? 'logo' then nullif(p->>'logo', '') else logo end,
      lat = case when p ? 'lat' then (p->>'lat')::float8 else lat end, lon = case when p ? 'lon' then (p->>'lon')::float8 else lon end, updated_at = now()
    where id = eid and user_id = u;
    if not found then raise exception 'Établissement introuvable' using errcode = 'P0001'; end if;
    update zp_campagnes set updated_at = now() where etablissement_id = eid;
  end if;
  return eid;
end $$;

create or replace function public.zp_etab_supprimer(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare u uuid := zp_uid();
begin
  if exists (select 1 from zp_campagnes where etablissement_id = p_id and user_id = u and statut in ('active', 'pause', 'a_valider') and fin >= current_date) then
    raise exception 'Cet établissement a des campagnes en cours : supprimez-les ou attendez leur fin' using errcode = 'P0001';
  end if;
  delete from zp_etablissements where id = p_id and user_id = u;
  if not found then raise exception 'Établissement introuvable' using errcode = 'P0001'; end if;
  return true;
end $$;

create or replace function public.zp_profil(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := zp_uid(); neuf boolean; cred int; tel text;
begin
  neuf := not exists (select 1 from zp_annonceurs where user_id = u);
  tel := nullif(regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g'), '');
  if tel is not null and tel ~ '^225[0-9]{10}$' then tel := substr(tel, 4); end if;
  insert into zp_annonceurs (user_id, nom, cat, tel, whatsapp, email, adresse, description, logo)
  values (u, btrim(p->>'nom'), coalesce(nullif(p->>'cat', ''), 'shop'), tel, coalesce((p->>'whatsapp')::boolean, true),
    (select email from auth.users where id = u), nullif(btrim(p->>'adresse'), ''), nullif(btrim(p->>'description'), ''), nullif(p->>'logo', ''))
  on conflict (user_id) do update set nom = excluded.nom, cat = excluded.cat, tel = excluded.tel, whatsapp = excluded.whatsapp,
    adresse = excluded.adresse, description = excluded.description,
    logo = case when p ? 'logo' then excluded.logo else zp_annonceurs.logo end, updated_at = now();
  if neuf and not exists (select 1 from zp_etablissements where user_id = u) then
    perform zp_etab_enregistrer(coalesce(p->'etablissement', p));
  end if;
  if neuf and zp_cfg('demo') = 'oui' then
    cred := coalesce(zp_cfg('credit_initial')::int, 0);
    if cred > 0 then
      update zp_annonceurs set solde = solde + cred where user_id = u;
      insert into zp_mouvements (user_id, montant, type, libelle) values (u, cred, 'credit_demo', 'Crédit de bienvenue (démo)');
    end if;
  end if;
  return zp_moi();
end $$;

create or replace function public.zp_recharger_demo() returns int
language plpgsql security definer set search_path = public as $$
declare u uuid := zp_uid(); m int := coalesce(zp_cfg('recharge_demo')::int, 0); s int;
begin
  if zp_cfg('demo') <> 'oui' then raise exception 'La recharge se fait par Mobile Money' using errcode = 'P0001'; end if;
  if not exists (select 1 from zp_annonceurs where user_id = u) then raise exception 'Complétez d''abord votre profil' using errcode = 'P0001'; end if;
  if (select count(*) from zp_mouvements where user_id = u and type = 'recharge_demo' and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Cinq recharges de démonstration par jour au maximum' using errcode = 'P0001';
  end if;
  update zp_annonceurs set solde = solde + m where user_id = u returning solde into s;
  insert into zp_mouvements (user_id, montant, type, libelle) values (u, m, 'recharge_demo', 'Recharge de démonstration');
  return s;
end $$;

create or replace function public.zp_mouvements_liste() returns setof zp_mouvements
language sql stable security definer set search_path = public as $$
  select * from zp_mouvements where user_id = zp_uid() order by created_at desc limit 60
$$;

-- débit du solde (interne)
create or replace function public.zp_debiter(u uuid, montant int, libelle text, cid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s int;
begin
  if montant <= 0 then return; end if;
  select solde into s from zp_annonceurs where user_id = u for update;
  if s is null then raise exception 'Complétez d''abord votre profil' using errcode = 'P0001'; end if;
  if s < montant then raise exception 'Solde insuffisant : % F disponibles, % F nécessaires', s, montant using errcode = 'P0001'; end if;
  update zp_annonceurs set solde = solde - montant where user_id = u;
  insert into zp_mouvements (user_id, montant, type, libelle, campagne_id) values (u, -montant, 'achat', libelle, cid);
end $$;

-- vérification d'une liste d'emplacements [{lat, lon, nom}]
create or replace function public.zp_points(p jsonb) returns jsonb
language plpgsql immutable security definer set search_path = public as $$
declare e jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'array' then return '[]'::jsonb; end if;
  if jsonb_array_length(p) > 50 then raise exception '50 emplacements au maximum par commande' using errcode = 'P0001'; end if;
  for e in select * from jsonb_array_elements(p) loop
    if (e->>'lat')::double precision not between 4 and 11 or (e->>'lon')::double precision not between -9 and -2 then
      raise exception 'Emplacement hors de Côte d''Ivoire' using errcode = 'P0001';
    end if;
  end loop;
  return p;
end $$;

-- ---------- campagnes ----------
create or replace function public.zp_campagne_creer(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := zp_uid(); d jsonb; cid uuid; deb date := current_date; e jsonb; pts jsonb; e_id uuid;
  mois int; sem int; valide boolean := zp_cfg('demo') <> 'oui';
begin
  if not exists (select 1 from zp_annonceurs where user_id = u) then raise exception 'Complétez d''abord votre profil' using errcode = 'P0001'; end if;
  if (select count(*) from zp_campagnes where user_id = u and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Dix campagnes par jour au maximum' using errcode = 'P0001';
  end if;
  e_id := nullif(p->>'etablissement_id', '')::uuid;
  if e_id is null then select id into e_id from zp_etablissements where user_id = u order by created_at limit 1; end if;
  if e_id is null or not exists (select 1 from zp_etablissements where id = e_id and user_id = u) then
    raise exception 'Choisissez l''établissement de la campagne' using errcode = 'P0001';
  end if;
  pts := zp_points(p->'panneaux');
  d := zp_devis(p || jsonb_build_object('panneaux', pts));
  mois := (d->>'mois')::int; sem := (d->>'semaines')::int;
  if coalesce(p->>'modele', 'promo') = 'visuel' and coalesce(p->>'image', '') = '' then
    raise exception 'Ajoutez votre visuel' using errcode = 'P0001';
  end if;
  if coalesce(p->>'modele', 'promo') <> 'visuel' and coalesce(btrim(p->>'titre'), '') = '' then
    raise exception 'Indiquez le titre de la publicité' using errcode = 'P0001';
  end if;
  insert into zp_campagnes (user_id, etablissement_id, layout, nom, statut, portee, siege_nom, siege_lat, siege_lon, modele, titre, sous_titre, accroche, cta, couleur, image, debut, fin)
  values (u, e_id, case when jsonb_typeof(p->'layout') = 'object' then p->'layout' end, btrim(coalesce(nullif(p->>'nom', ''), p->>'titre', 'Ma campagne')), case when valide then 'a_valider' else 'active' end,
    coalesce(nullif(p->>'portee', ''), 'ville'), btrim(p->'siege'->>'nom'), (p->'siege'->>'lat')::float8, (p->'siege'->>'lon')::float8,
    coalesce(nullif(p->>'modele', ''), 'promo'), left(nullif(btrim(p->>'titre'), ''), 40), left(nullif(btrim(p->>'sous_titre'), ''), 60),
    left(nullif(btrim(p->>'accroche'), ''), 14), coalesce(nullif(p->>'cta', ''), 'appel'), coalesce(nullif(p->>'couleur', ''), 'jaune'),
    nullif(p->>'image', ''), deb, deb + mois * 30 - 1)
  returning id into cid;
  insert into zp_panneaux (campagne_id, code, type, nom, lat, lon, debut, fin)
  values (cid, zp_code('siege'), 'siege', btrim(p->'siege'->>'nom'), (p->'siege'->>'lat')::float8, (p->'siege'->>'lon')::float8, deb, deb + mois * 30 - 1);
  for e in select * from jsonb_array_elements(pts) loop
    insert into zp_panneaux (campagne_id, code, type, nom, lat, lon, debut, fin)
    values (cid, zp_code('city'), 'city', left(nullif(btrim(e->>'nom'), ''), 80), (e->>'lat')::float8, (e->>'lon')::float8, deb, deb + sem * 7 - 1);
  end loop;
  perform zp_debiter(u, (d->>'total')::int, 'Campagne « ' || btrim(coalesce(nullif(p->>'nom', ''), p->>'titre', 'Ma campagne')) || ' »', cid);
  return cid;
end $$;

create or replace function public.zp_campagne_modifier(p_id uuid, p jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare u uuid := zp_uid();
begin
  update zp_campagnes set
    nom = coalesce(nullif(btrim(p->>'nom'), ''), nom),
    portee = coalesce(nullif(p->>'portee', ''), portee),
    modele = coalesce(nullif(p->>'modele', ''), modele),
    titre = left(nullif(btrim(p->>'titre'), ''), 40), sous_titre = left(nullif(btrim(p->>'sous_titre'), ''), 60),
    accroche = left(nullif(btrim(p->>'accroche'), ''), 14),
    cta = coalesce(nullif(p->>'cta', ''), cta), couleur = coalesce(nullif(p->>'couleur', ''), couleur),
    image = case when p ? 'image' then nullif(p->>'image', '') else image end,
    layout = case when p ? 'layout' then (case when jsonb_typeof(p->'layout') = 'object' then p->'layout' end) else layout end,
    etablissement_id = case when nullif(p->>'etablissement_id', '') is not null
      and exists (select 1 from zp_etablissements x where x.id = (p->>'etablissement_id')::uuid and x.user_id = u) then (p->>'etablissement_id')::uuid else etablissement_id end,
    statut = case when zp_cfg('demo') <> 'oui' and statut = 'active' then 'a_valider' else statut end,
    updated_at = now()
  where id = p_id and user_id = u;
  if not found then raise exception 'Campagne introuvable' using errcode = 'P0001'; end if;
  return true;
end $$;

create or replace function public.zp_panneaux_ajouter(p_id uuid, p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare u uuid := zp_uid(); pts jsonb := zp_points(p->'panneaux'); d jsonb; e jsonb; sem int; n int := 0;
begin
  if not exists (select 1 from zp_campagnes where id = p_id and user_id = u) then raise exception 'Campagne introuvable' using errcode = 'P0001'; end if;
  if jsonb_array_length(pts) = 0 then raise exception 'Ajoutez au moins un emplacement' using errcode = 'P0001'; end if;
  d := zp_devis(jsonb_build_object('panneaux', pts, 'semaines', p->'semaines', 'sans_siege', true));
  sem := (d->>'semaines')::int;
  for e in select * from jsonb_array_elements(pts) loop
    insert into zp_panneaux (campagne_id, code, type, nom, lat, lon, debut, fin)
    values (p_id, zp_code('city'), 'city', left(nullif(btrim(e->>'nom'), ''), 80), (e->>'lat')::float8, (e->>'lon')::float8, current_date, current_date + sem * 7 - 1);
    n := n + 1;
  end loop;
  perform zp_debiter(u, (d->>'total')::int, n || ' emplacement(s) pour ' || sem || ' semaine(s)', p_id);
  return n;
end $$;

create or replace function public.zp_campagne_action(p_id uuid, p_action text) returns boolean
language plpgsql security definer set search_path = public as $$
declare u uuid := zp_uid(); c zp_campagnes; v_prix int;
begin
  select * into c from zp_campagnes where id = p_id and user_id = u;
  if not found then raise exception 'Campagne introuvable' using errcode = 'P0001'; end if;
  if p_action = 'pause' then update zp_campagnes set statut = 'pause', updated_at = now() where id = p_id and statut = 'active';
  elsif p_action = 'reprendre' then update zp_campagnes set statut = 'active', updated_at = now() where id = p_id and statut = 'pause';
  elsif p_action = 'prolonger' then -- un mois de plus pour le panneau siège
    v_prix := (select t.prix from zp_tarifs t where t.code = 'siege');
    perform zp_debiter(u, v_prix, 'Prolongation d''un mois « ' || c.nom || ' »', p_id);
    update zp_campagnes set fin = greatest(fin, current_date - 1) + 30, updated_at = now() where id = p_id;
    update zp_panneaux set fin = greatest(fin, current_date - 1) + 30 where campagne_id = p_id and type = 'siege';
  elsif p_action = 'supprimer' then delete from zp_campagnes where id = p_id;
  else raise exception 'Action inconnue' using errcode = 'P0001';
  end if;
  return true;
end $$;

create or replace function public.zp_mes_campagnes() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) from (
    select to_jsonb(c) - 'user_id' - 'layout' || jsonb_build_object('a_layout', c.layout is not null,
      'panneaux', (select coalesce(jsonb_agg(to_jsonb(pn) - 'campagne_id' order by pn.type desc, pn.code), '[]'::jsonb) from zp_panneaux pn where pn.campagne_id = c.id),
      'stats', (select jsonb_build_object('vues', coalesce(sum(vues), 0), 'touchers', coalesce(sum(touchers), 0), 'appels', coalesce(sum(appels), 0),
                 'itineraires', coalesce(sum(itineraires), 0), 'visites', coalesce(sum(visites), 0)) from zp_stats s where s.campagne_id = c.id)) as x
    from zp_campagnes c where c.user_id = zp_uid()) q
$$;

create or replace function public.zp_campagne_layout(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select layout from zp_campagnes where id = p_id and user_id = zp_uid()
$$;

create or replace function public.zp_campagne_stats(p_id uuid) returns setof zp_stats
language sql stable security definer set search_path = public as $$
  select s.* from zp_stats s join zp_campagnes c on c.id = s.campagne_id
  where s.campagne_id = p_id and c.user_id = zp_uid() and s.jour > current_date - 60 order by s.jour
$$;

-- ---------- diffusion dans l'application (public, sans connexion) ----------
create or replace function public.zp_diffusion() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'commerce', coalesce(e.nom, a.nom), 'cat', coalesce(e.cat, a.cat), 'tel', coalesce(e.tel, a.tel), 'whatsapp', coalesce(e.whatsapp, a.whatsapp),
      'lat', c.siege_lat, 'lon', c.siege_lon, 'lieu', c.siege_nom, 'portee', c.portee,
      'debut', c.debut, 'fin', c.fin, 'modele', c.modele, 'titre', c.titre, 'sous_titre', c.sous_titre,
      'accroche', c.accroche, 'cta', c.cta, 'couleur', c.couleur, 'img', c.image is not null,
      'v', extract(epoch from c.updated_at)::bigint,
      'city', (select coalesce(jsonb_agg(jsonb_build_array(round(pn.lat::numeric, 6), round(pn.lon::numeric, 6))), '[]'::jsonb)
               from zp_panneaux pn where pn.campagne_id = c.id and pn.type = 'city' and current_date between pn.debut and pn.fin))), '[]'::jsonb)
  from zp_campagnes c join zp_annonceurs a on a.user_id = c.user_id left join zp_etablissements e on e.id = c.etablissement_id
  where c.statut = 'active' and current_date between c.debut and c.fin
$$;

create or replace function public.zp_visuel(p_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select image from zp_campagnes where id = p_id and statut = 'active'
$$;

create or replace function public.zp_compter(p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare e jsonb; n int := 0;
begin
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 40 then return 0; end if;
  for e in select * from jsonb_array_elements(p) loop
    if not exists (select 1 from zp_campagnes where id = (e->>'id')::uuid and statut = 'active') then continue; end if;
    insert into zp_stats (campagne_id, jour, vues, touchers, appels, itineraires, visites)
    values ((e->>'id')::uuid, current_date, least(greatest(coalesce((e->>'v')::int, 0), 0), 50), least(greatest(coalesce((e->>'t')::int, 0), 0), 20),
      least(greatest(coalesce((e->>'a')::int, 0), 0), 10), least(greatest(coalesce((e->>'i')::int, 0), 0), 10), least(greatest(coalesce((e->>'p')::int, 0), 0), 5))
    on conflict (campagne_id, jour) do update set vues = zp_stats.vues + excluded.vues, touchers = zp_stats.touchers + excluded.touchers,
      appels = zp_stats.appels + excluded.appels, itineraires = zp_stats.itineraires + excluded.itineraires, visites = zp_stats.visites + excluded.visites;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- droits ----------
do $$
declare f text;
begin
  -- fonctions internes : jamais appelables directement
  foreach f in array array['zp_cfg(text)', 'zp_uid()', 'zp_debiter(uuid, int, text, uuid)', 'zp_points(jsonb)', 'zp_code(text)', 'zp_prix_city(int, int)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  -- espace annonceur : connecté uniquement
  foreach f in array array['zp_moi()', 'zp_profil(jsonb)', 'zp_etab_enregistrer(jsonb)', 'zp_etab_supprimer(uuid)', 'zp_campagne_layout(uuid)', 'zp_recharger_demo()', 'zp_mouvements_liste()', 'zp_campagne_creer(jsonb)',
    'zp_campagne_modifier(uuid, jsonb)', 'zp_panneaux_ajouter(uuid, jsonb)', 'zp_campagne_action(uuid, text)', 'zp_mes_campagnes()', 'zp_campagne_stats(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- application et devis : public
  foreach f in array array['zp_devis(jsonb)', 'zp_diffusion()', 'zp_visuel(uuid)', 'zp_compter(jsonb)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
