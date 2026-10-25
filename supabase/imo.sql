-- =====================================================================
-- ZUPA — Imo : logements mis en location par des particuliers et des agents
-- À exécuter une fois dans Supabase > SQL Editor (après amis.sql). Peut être relancé sans risque.
--
-- Garde-fous de localisation (le cœur de l'onglet) :
--  * une annonce sans coordonnées GPS est IMPOSSIBLE (colonnes obligatoires, aucune adresse seule) ;
--  * la mesure GPS doit être précise (± 50 m au plus) et récente (moins de 2 h avant la publication) ;
--  * le repère publié ne peut pas être à plus de 80 m de la mesure GPS prise sur place ;
--  * coordonnées limitées à la Côte d'Ivoire ;
--  * 3 signalements « mal localisée / fictive » de personnes différentes masquent l'annonce.
-- Confidentialité : le propriétaire de l'annonce n'est identifié que par l'empreinte de son secret
-- (comme pour les amis) ; cette empreinte et la mesure GPS brute ne sont jamais lisibles.
-- =====================================================================
create extension if not exists pgcrypto;

create table if not exists public.annonces (
  id uuid primary key default gen_random_uuid(),
  owner_hash bytea not null,
  role text not null check (role in ('proprietaire', 'agent')),
  type text not null check (type in ('chambre', 'studio', '2p', '3p', '4p', '5p', 'villa', 'duplex')),
  chambres smallint not null check (chambres between 0 and 12),
  sdb smallint not null check (sdb between 0 and 10),
  cuisine boolean not null default true,
  douche_int boolean not null default true,
  meuble boolean not null default false,
  surface smallint check (surface between 8 and 2000),
  etage smallint check (etage between -1 and 60),
  loyer integer not null check (loyer between 5000 and 50000000),
  avance smallint check (avance between 0 and 24),
  caution smallint check (caution between 0 and 24),
  frais_visite integer check (frais_visite between 0 and 200000),
  bail_mois smallint check (bail_mois between 1 and 120),
  description text check (char_length(description) <= 600),
  quartier text not null check (char_length(btrim(quartier)) between 2 and 60),
  adresse text check (char_length(adresse) <= 120),
  -- position publiée (repère) et mesure GPS prise sur place
  lat double precision not null,
  lon double precision not null,
  gps_lat double precision not null,
  gps_lon double precision not null,
  gps_acc real not null check (gps_acc > 0 and gps_acc <= 50),
  gps_at timestamptz not null,
  contact_nom text check (char_length(contact_nom) <= 60),
  tel text not null check (tel ~ '^[0-9]{10}$'),
  whatsapp boolean not null default true,
  thumb text check (thumb is null or (char_length(thumb) < 40000 and thumb like 'data:image/jpeg;base64,%')),
  nb_photos smallint not null default 0 check (nb_photos between 0 and 6),
  signalements smallint not null default 0,
  statut text not null default 'active' check (statut in ('active', 'louee')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '45 days',
  constraint annonce_en_ci check (lat between 4.3 and 10.8 and lon between -8.7 and -2.4),
  constraint annonce_gps_en_ci check (gps_lat between 4.3 and 10.8 and gps_lon between -8.7 and -2.4),
  -- repère à 80 m au plus de la mesure GPS (approximation plane, largement suffisante à cette échelle)
  constraint annonce_repere_pres_du_gps check (
    111320 * sqrt(power(lat - gps_lat, 2) + power((lon - gps_lon) * cos(radians(gps_lat)), 2)) <= 80)
);
create index if not exists annonces_actives on public.annonces (created_at desc) where statut = 'active';

create table if not exists public.annonce_photos (
  annonce_id uuid not null references public.annonces (id) on delete cascade,
  idx smallint not null check (idx between 0 and 5),
  data text not null check (char_length(data) < 400000 and data like 'data:image/jpeg;base64,%'),
  primary key (annonce_id, idx)
);

create table if not exists public.annonce_signalements (
  annonce_id uuid not null references public.annonces (id) on delete cascade,
  qui bytea not null,
  motif text not null check (motif in ('mal_localisee', 'fictive', 'deja_louee', 'arnaque', 'autre')),
  created_at timestamptz not null default now(),
  primary key (annonce_id, qui)
);

-- ---------- lecture publique : annonces actives, non expirées, non masquées ----------
alter table public.annonces enable row level security;
alter table public.annonce_photos enable row level security;
alter table public.annonce_signalements enable row level security;

drop policy if exists annonces_lecture on public.annonces;
create policy annonces_lecture on public.annonces for select to anon, authenticated
  using (statut = 'active' and expires_at > now() and signalements < 3);
drop policy if exists photos_lecture on public.annonce_photos;
create policy photos_lecture on public.annonce_photos for select to anon, authenticated
  using (exists (select 1 from public.annonces a where a.id = annonce_id and a.statut = 'active' and a.expires_at > now() and a.signalements < 3));

revoke all on public.annonces, public.annonce_photos, public.annonce_signalements from anon, authenticated;
-- colonnes lisibles : ni l'empreinte du propriétaire, ni la mesure GPS brute
grant select (id, role, type, chambres, sdb, cuisine, douche_int, meuble, surface, etage, loyer, avance, caution,
  frais_visite, bail_mois, description, quartier, adresse, lat, lon, gps_acc, contact_nom, tel, whatsapp, thumb,
  nb_photos, created_at, expires_at) on public.annonces to anon, authenticated;
grant select on public.annonce_photos to anon, authenticated;

-- ---------- publier ----------
create or replace function public.annonce_publier(p_secret uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); v uuid; t timestamptz;
begin
  if p is null then raise exception 'Annonce vide' using errcode = 'P0001'; end if;
  -- la localisation GPS est obligatoire : un quartier ou une adresse seule ne suffit jamais
  if p->>'lat' is null or p->>'lon' is null or p->>'gps_lat' is null or p->>'gps_lon' is null or p->>'gps_acc' is null or p->>'gps_at' is null then
    raise exception 'Coordonnées GPS obligatoires : localisez le logement sur place' using errcode = 'P0001';
  end if;
  if (p->>'gps_acc')::real > 50 then raise exception 'Signal GPS trop imprécis (± % m) : 50 m au plus', round((p->>'gps_acc')::numeric) using errcode = 'P0001'; end if;
  t := (p->>'gps_at')::timestamptz;
  if t < now() - interval '2 hours' or t > now() + interval '10 minutes' then
    raise exception 'Mesure GPS trop ancienne : localisez à nouveau le logement' using errcode = 'P0001';
  end if;
  if not ((p->>'lat')::float8 between 4.3 and 10.8 and (p->>'lon')::float8 between -8.7 and -2.4) then
    raise exception 'Le logement doit être situé en Côte d''Ivoire' using errcode = 'P0001';
  end if;
  if 111320 * sqrt(power((p->>'lat')::float8 - (p->>'gps_lat')::float8, 2) + power(((p->>'lon')::float8 - (p->>'gps_lon')::float8) * cos(radians((p->>'gps_lat')::float8)), 2)) > 80 then
    raise exception 'Le repère est à plus de 80 m de votre position GPS : localisez-vous au logement' using errcode = 'P0001';
  end if;
  if (select count(*) from annonces where owner_hash = h and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Limite atteinte : 5 annonces par jour' using errcode = 'P0001';
  end if;
  if (select count(*) from annonces where owner_hash = h and statut = 'active' and expires_at > now()) >= 15 then
    raise exception 'Limite atteinte : 15 annonces actives' using errcode = 'P0001';
  end if;
  if exists (select 1 from annonces where owner_hash = h and statut = 'active' and type = p->>'type' and loyer = (p->>'loyer')::int
             and abs(lat - (p->>'lat')::float8) < 0.0002 and abs(lon - (p->>'lon')::float8) < 0.0002) then
    raise exception 'Cette annonce est déjà publiée' using errcode = 'P0001';
  end if;
  insert into annonces (owner_hash, role, type, chambres, sdb, cuisine, douche_int, meuble, surface, etage, loyer, avance, caution,
    frais_visite, bail_mois, description, quartier, adresse, lat, lon, gps_lat, gps_lon, gps_acc, gps_at, contact_nom, tel, whatsapp, thumb)
  values (h, p->>'role', p->>'type', (p->>'chambres')::smallint, (p->>'sdb')::smallint, coalesce((p->>'cuisine')::boolean, true),
    coalesce((p->>'douche_int')::boolean, true), coalesce((p->>'meuble')::boolean, false), (p->>'surface')::smallint, (p->>'etage')::smallint,
    (p->>'loyer')::int, (p->>'avance')::smallint, (p->>'caution')::smallint, (p->>'frais_visite')::int, (p->>'bail_mois')::smallint,
    nullif(btrim(p->>'description'), ''), btrim(p->>'quartier'), nullif(btrim(p->>'adresse'), ''),
    (p->>'lat')::float8, (p->>'lon')::float8, (p->>'gps_lat')::float8, (p->>'gps_lon')::float8, (p->>'gps_acc')::real, t,
    nullif(btrim(p->>'contact_nom'), ''), regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g'), coalesce((p->>'whatsapp')::boolean, true), p->>'thumb')
  returning id into v;
  return v;
end $$;

create or replace function public.annonce_photo(p_secret uuid, p_id uuid, p_idx int, p_data text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from annonces where id = p_id and owner_hash = digest(p_secret::text, 'sha256')) then
    raise exception 'Annonce introuvable' using errcode = 'P0001';
  end if;
  insert into annonce_photos (annonce_id, idx, data) values (p_id, p_idx, p_data)
    on conflict (annonce_id, idx) do update set data = excluded.data;
  update annonces set nb_photos = (select count(*) from annonce_photos where annonce_id = p_id) where id = p_id;
  return true;
end $$;

-- louee : n'apparaît plus ; renouveler : 45 jours de plus ; retirer : supprimée avec ses photos
create or replace function public.annonce_statut(p_secret uuid, p_id uuid, p_action text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256');
begin
  if p_action = 'retirer' then delete from annonces where id = p_id and owner_hash = h;
  elsif p_action = 'louee' then update annonces set statut = 'louee' where id = p_id and owner_hash = h;
  elsif p_action = 'renouveler' then update annonces set statut = 'active', expires_at = now() + interval '45 days' where id = p_id and owner_hash = h;
  else raise exception 'Action inconnue' using errcode = 'P0001';
  end if;
  return found;
end $$;

create or replace function public.mes_annonces(p_secret uuid)
returns table (id uuid, type text, quartier text, loyer int, statut text, signalements smallint, nb_photos smallint, created_at timestamptz, expires_at timestamptz)
language sql security definer set search_path = public, extensions as $$
  select id, type, quartier, loyer, statut, signalements, nb_photos, created_at, expires_at
  from annonces where owner_hash = digest(p_secret::text, 'sha256') order by created_at desc;
$$;

create or replace function public.annonce_signaler(p_secret uuid, p_id uuid, p_motif text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256');
begin
  if p_id is null or not exists (select 1 from annonces where id = p_id) then return false; end if;
  if exists (select 1 from annonces where id = p_id and owner_hash = h) then return false; end if;
  insert into annonce_signalements (annonce_id, qui, motif) values (p_id, h, p_motif) on conflict do nothing;
  if found then update annonces set signalements = signalements + 1 where id = p_id; end if;
  return found;
end $$;

-- « Supprimer mes données » : retire aussi les annonces de ce téléphone
create or replace function public.mes_annonces_supprimer(p_secret uuid) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  delete from annonces where owner_hash = digest(p_secret::text, 'sha256');
  get diagnostics n = row_count;
  return n;
end $$;

do $$
declare f text;
begin
  foreach f in array array['annonce_publier(uuid, jsonb)', 'annonce_photo(uuid, uuid, int, text)', 'annonce_statut(uuid, uuid, text)',
    'mes_annonces(uuid)', 'annonce_signaler(uuid, uuid, text)', 'mes_annonces_supprimer(uuid)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
