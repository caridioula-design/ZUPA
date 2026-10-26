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
-- Clé numérique (section 2 plus bas) : remise des clés sur place entre l'agent et le locataire, restitution,
-- perte du téléphone (code de secours), réémission, reprise après la fin du bail ; un logement dont la clé
-- est remise disparaît des annonces et ne peut pas être republié.
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
  statut text not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '45 days',
  constraint annonce_en_ci check (lat between 4.3 and 10.8 and lon between -8.7 and -2.4),
  constraint annonce_gps_en_ci check (gps_lat between 4.3 and 10.8 and gps_lon between -8.7 and -2.4),
  -- repère à 80 m au plus de la mesure GPS (approximation plane, largement suffisante à cette échelle)
  constraint annonce_repere_pres_du_gps check (
    111320 * sqrt(power(lat - gps_lat, 2) + power((lon - gps_lon) * cos(radians(gps_lat)), 2)) <= 80)
);
create index if not exists annonces_actives on public.annonces (created_at desc) where statut = 'active';
-- (relance sans risque) statuts de la clé numérique, porte / numéro du logement, nombre de remises réussies de l'agent
alter table public.annonces drop constraint if exists annonces_statut_check;
alter table public.annonces add constraint annonces_statut_check check (statut in ('active', 'louee', 'occupee', 'retiree'));
alter table public.annonces add column if not exists porte text check (char_length(porte) <= 40);
alter table public.annonces add column if not exists remises smallint not null default 0;

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
  nb_photos, created_at, expires_at, porte, remises) on public.annonces to anon, authenticated;
grant select on public.annonce_photos to anon, authenticated;

-- ---------- clés numériques : tables (les fonctions sont plus bas) ----------
create or replace function public.imo_metres(a_lat float8, a_lon float8, b_lat float8, b_lon float8) returns float8
language sql immutable as $$ select 111320 * sqrt(power(a_lat - b_lat, 2) + power((a_lon - b_lon) * cos(radians((a_lat + b_lat) / 2)), 2)) $$;

create table if not exists public.cles (
  id uuid primary key default gen_random_uuid(),
  annonce_id uuid not null references public.annonces (id) on delete restrict,
  agent_hash bytea not null,
  client_hash bytea,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'active', 'restituee', 'reprise', 'annulee')),
  code_hash bytea,                -- code à usage unique (remise, restitution ou réémission), valable 20 min
  code_but text check (code_but in ('remise', 'restitution', 'reemission')),
  code_exp timestamptz,
  recup_hash bytea,               -- code de secours du locataire (changer de téléphone sans l'agent)
  client_nom text check (char_length(client_nom) <= 60),
  client_tel text check (client_tel ~ '^[0-9]{10}$'),
  loyer integer, avance smallint, caution smallint, bail_mois smallint,   -- conditions acceptées par les deux à la remise
  debut date, fin_prevue date, fin_at timestamptz,
  reprise_demandee_at timestamptz, contestee_at timestamptz,
  created_at timestamptz not null default now()
);
-- une seule clé (en cours de remise ou remise) par logement : impossible de louer deux fois la même maison
create unique index if not exists cles_une_par_logement on public.cles (annonce_id) where statut in ('en_attente', 'active');
create index if not exists cles_agent on public.cles (agent_hash);
create index if not exists cles_client on public.cles (client_hash);

-- journal ineffaçable : chaque étape, qui l'a faite, quand et où (preuve en cas de litige)
create table if not exists public.cle_journal (
  id bigserial primary key,
  cle_id uuid not null references public.cles (id) on delete cascade,
  at timestamptz not null default now(),
  par text not null check (par in ('agent', 'locataire', 'systeme')),
  evenement text not null,
  lat double precision, lon double precision
);
create table if not exists public.cle_essais (qui bytea not null, at timestamptz not null default now(), ok boolean not null);
create index if not exists cle_essais_qui on public.cle_essais (qui, at desc);
alter table public.cles enable row level security;
alter table public.cle_journal enable row level security;
alter table public.cle_essais enable row level security;
revoke all on public.cles, public.cle_journal, public.cle_essais from anon, authenticated;

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
  -- logement occupé (clé numérique remise) : impossible de le republier, par qui que ce soit
  if exists (select 1 from cles c join annonces a on a.id = c.annonce_id
             where c.statut in ('active', 'en_attente') and public.imo_metres(a.lat, a.lon, (p->>'lat')::float8, (p->>'lon')::float8) <= 30
               and a.type = p->>'type' and coalesce(a.etage, -99) = coalesce((p->>'etage')::smallint, -99)
               and (nullif(btrim(a.porte), '') is null or nullif(btrim(p->>'porte'), '') is null or lower(btrim(a.porte)) = lower(btrim(p->>'porte')))) then
    raise exception 'Ce logement est occupé : sa clé numérique a été remise à un locataire. S''il s''agit d''un autre logement du même immeuble, indiquez sa porte ou son étage.' using errcode = 'P0001';
  end if;
  -- le même agent (ou le même numéro) qui publie près d'un logement occupé doit préciser la porte
  if nullif(btrim(p->>'porte'), '') is null and exists (select 1 from cles c join annonces a on a.id = c.annonce_id
             where c.statut = 'active' and public.imo_metres(a.lat, a.lon, (p->>'lat')::float8, (p->>'lon')::float8) <= 30
               and (c.agent_hash = h or a.tel = regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g'))) then
    raise exception 'Vous avez déjà remis la clé d''un logement à cette adresse : indiquez la porte ou l''étage de ce nouveau logement.' using errcode = 'P0001';
  end if;
  insert into annonces (owner_hash, role, type, chambres, sdb, cuisine, douche_int, meuble, surface, etage, loyer, avance, caution,
    frais_visite, bail_mois, description, quartier, adresse, lat, lon, gps_lat, gps_lon, gps_acc, gps_at, contact_nom, tel, whatsapp, thumb, porte, remises)
  values (h, p->>'role', p->>'type', (p->>'chambres')::smallint, (p->>'sdb')::smallint, coalesce((p->>'cuisine')::boolean, true),
    coalesce((p->>'douche_int')::boolean, true), coalesce((p->>'meuble')::boolean, false), (p->>'surface')::smallint, (p->>'etage')::smallint,
    (p->>'loyer')::int, (p->>'avance')::smallint, (p->>'caution')::smallint, (p->>'frais_visite')::int, (p->>'bail_mois')::smallint,
    nullif(btrim(p->>'description'), ''), btrim(p->>'quartier'), nullif(btrim(p->>'adresse'), ''),
    (p->>'lat')::float8, (p->>'lon')::float8, (p->>'gps_lat')::float8, (p->>'gps_lon')::float8, (p->>'gps_acc')::real, t,
    nullif(btrim(p->>'contact_nom'), ''), regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g'), coalesce((p->>'whatsapp')::boolean, true), p->>'thumb',
    nullif(btrim(p->>'porte'), ''), (select count(*) from cles where agent_hash = h and statut in ('active', 'restituee')))
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
  if p_action <> 'louee' and exists (select 1 from cles where annonce_id = p_id and statut in ('active', 'en_attente')) then
    raise exception 'Une clé numérique est en cours pour ce logement : faites d''abord la restitution des clés' using errcode = 'P0001';
  end if;
  if p_action = 'retirer' then
    -- l'historique des clés est conservé (preuve pour les deux parties) : l'annonce est seulement retirée
    if exists (select 1 from cles where annonce_id = p_id) then update annonces set statut = 'retiree' where id = p_id and owner_hash = h;
    else delete from annonces where id = p_id and owner_hash = h; end if;
  elsif p_action = 'louee' then update annonces set statut = 'louee' where id = p_id and owner_hash = h and statut <> 'occupee';
  elsif p_action = 'renouveler' then update annonces set statut = 'active', expires_at = now() + interval '45 days' where id = p_id and owner_hash = h;
  else raise exception 'Action inconnue' using errcode = 'P0001';
  end if;
  return found;
end $$;

drop function if exists public.mes_annonces(uuid);
create or replace function public.mes_annonces(p_secret uuid)
returns table (id uuid, type text, quartier text, loyer int, statut text, signalements smallint, nb_photos smallint, created_at timestamptz, expires_at timestamptz, porte text)
language sql security definer set search_path = public, extensions as $$
  select id, type, quartier, loyer, statut, signalements, nb_photos, created_at, expires_at, porte
  from annonces where owner_hash = digest(p_secret::text, 'sha256') and statut <> 'retiree' order by created_at desc;
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
  -- les annonces liées à une clé numérique sont seulement retirées : l'historique protège aussi le locataire
  update annonces a set statut = 'retiree' where owner_hash = digest(p_secret::text, 'sha256') and exists (select 1 from cles c where c.annonce_id = a.id);
  delete from annonces a where owner_hash = digest(p_secret::text, 'sha256') and not exists (select 1 from cles c where c.annonce_id = a.id);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- modifier une annonce (par son auteur) ----------
-- La position GPS ne se modifie pas : pour déplacer un logement, il faut le republier sur place.
create or replace function public.annonce_detail(p_secret uuid, p_id uuid) returns jsonb
language sql security definer set search_path = public, extensions as $$
  select to_jsonb(a) - 'owner_hash' - 'gps_lat' - 'gps_lon' || jsonb_build_object('photos',
    (select coalesce(jsonb_agg(ph.data order by ph.idx), '[]') from annonce_photos ph where ph.annonce_id = a.id))
  from annonces a where a.id = p_id and a.owner_hash = digest(p_secret::text, 'sha256');
$$;
create or replace function public.annonce_modifier(p_secret uuid, p_id uuid, p jsonb) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); a annonces;
begin
  select * into a from annonces where id = p_id and owner_hash = h for update;
  if not found then raise exception 'Annonce introuvable' using errcode = 'P0001'; end if;
  if a.statut = 'occupee' or exists (select 1 from cles where annonce_id = a.id and statut in ('active', 'en_attente')) then
    raise exception 'Logement occupé : une clé numérique est en cours, l''annonce ne peut pas être modifiée' using errcode = 'P0001';
  end if;
  if exists (select 1 from cles c join annonces o on o.id = c.annonce_id
             where c.statut in ('active', 'en_attente') and o.id <> a.id and imo_metres(o.lat, o.lon, a.lat, a.lon) <= 30
               and o.type = p->>'type' and coalesce(o.etage, -99) = coalesce((p->>'etage')::smallint, -99)
               and (nullif(btrim(o.porte), '') is null or nullif(btrim(p->>'porte'), '') is null or lower(btrim(o.porte)) = lower(btrim(p->>'porte')))) then
    raise exception 'Un logement occupé correspond à cette description : indiquez la porte ou l''étage exact' using errcode = 'P0001';
  end if;
  update annonces set role = p->>'role', type = p->>'type', chambres = (p->>'chambres')::smallint, sdb = (p->>'sdb')::smallint,
    cuisine = coalesce((p->>'cuisine')::boolean, true), douche_int = coalesce((p->>'douche_int')::boolean, true), meuble = coalesce((p->>'meuble')::boolean, false),
    surface = (p->>'surface')::smallint, etage = (p->>'etage')::smallint, loyer = (p->>'loyer')::int, avance = (p->>'avance')::smallint,
    caution = (p->>'caution')::smallint, frais_visite = (p->>'frais_visite')::int, bail_mois = (p->>'bail_mois')::smallint,
    description = nullif(btrim(p->>'description'), ''), adresse = nullif(btrim(p->>'adresse'), ''), porte = nullif(btrim(p->>'porte'), ''),
    contact_nom = nullif(btrim(p->>'contact_nom'), ''), tel = regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g'),
    whatsapp = coalesce((p->>'whatsapp')::boolean, true), thumb = coalesce(p->>'thumb', thumb)
  where id = a.id;
  return true;
end $$;
-- après l'envoi des photos modifiées : on retire celles en trop
create or replace function public.annonce_photos_garder(p_secret uuid, p_id uuid, p_n int) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from annonces where id = p_id and owner_hash = digest(p_secret::text, 'sha256')) then return false; end if;
  delete from annonce_photos where annonce_id = p_id and idx >= greatest(p_n, 1);
  update annonces set nb_photos = (select count(*) from annonce_photos where annonce_id = p_id) where id = p_id;
  return true;
end $$;

-- =====================================================================
-- 2. CLÉ NUMÉRIQUE
--  Remise : l'agent, au logement, obtient un code à usage unique (20 min) ; le locataire, au logement aussi,
--    le saisit, vérifie les conditions (loyer, avance, caution) et accepte. La clé est alors active :
--    l'annonce disparaît, le logement ne peut plus être republié, une seule clé possible par logement.
--  Restitution : le locataire, au logement, obtient un code ; l'agent le saisit. Le logement est libéré.
--  Perte du téléphone : le locataire récupère sa clé sur un nouveau téléphone avec son code de secours.
--    S'il a aussi perdu ce code : l'agent réémet la clé au logement, au même numéro de téléphone.
--  Reprise (locataire injoignable) : seulement après la fin du bail et 30 jours de préavis sans contestation.
-- =====================================================================
create or replace function public.cle_code() returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') from generate_series(1, 6);
$$;
create or replace function public.cle_norm(c text) returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(c, ''), '[^0-9A-Za-z]', '', 'g'));
$$;
-- 8 codes faux par heure et par téléphone ; frein général contre les essais en masse
create or replace function public.cle_essai(h bytea, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into cle_essais (qui, ok) values (h, ok);
  delete from cle_essais where at < now() - interval '1 day';
end $$;
create or replace function public.cle_frein(h bytea) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from cle_essais where qui = h and not ok and at > now() - interval '1 hour') >= 8 then
    raise exception 'Trop de codes erronés : réessayez dans une heure' using errcode = 'P0001';
  end if;
  if (select count(*) from cle_essais where not ok and at > now() - interval '1 minute') >= 120 then
    raise exception 'Service momentanément saturé : réessayez dans une minute' using errcode = 'P0001';
  end if;
end $$;
-- présence au logement : GPS précis (± 100 m) à 150 m au plus de la position vérifiée de l'annonce
create or replace function public.cle_sur_place(a annonces, p_lat float8, p_lon float8, p_acc real) returns void
language plpgsql stable as $$
begin
  if p_lat is null or p_lon is null or p_acc is null then raise exception 'Position GPS obligatoire : la remise se fait au logement' using errcode = 'P0001'; end if;
  if p_acc > 100 then raise exception 'Signal GPS trop imprécis (± % m) : sortez à découvert et réessayez', round(p_acc) using errcode = 'P0001'; end if;
  if imo_metres(a.lat, a.lon, p_lat, p_lon) > 150 then
    raise exception 'Vous êtes à % m du logement : la remise des clés se fait sur place', round(imo_metres(a.lat, a.lon, p_lat, p_lon)) using errcode = 'P0001';
  end if;
end $$;
create or replace function public.cle_noter(p_cle uuid, p_par text, p_ev text, p_lat float8 default null, p_lon float8 default null) returns void
language sql security definer set search_path = public as $$
  insert into cle_journal (cle_id, par, evenement, lat, lon) values (p_cle, p_par, p_ev, round(p_lat::numeric, 4), round(p_lon::numeric, 4));
$$;
create or replace function public.cle_compter_remises(h bytea) returns void
language sql security definer set search_path = public as $$
  update annonces set remises = (select count(*) from cles where agent_hash = h and statut in ('active', 'restituee')) where owner_hash = h;
$$;

-- l'agent, au logement, prépare la remise : renvoie le code à donner au locataire
create or replace function public.cle_preparer(p_secret uuid, p_annonce uuid, p_lat float8, p_lon float8, p_acc real) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); a annonces; c text := cle_code(); v uuid;
begin
  select * into a from annonces where id = p_annonce and owner_hash = h;
  if not found then raise exception 'Annonce introuvable' using errcode = 'P0001'; end if;
  if a.statut = 'occupee' or exists (select 1 from cles where annonce_id = a.id and statut = 'active') then
    raise exception 'La clé de ce logement est déjà remise. Si le locataire a perdu son téléphone, utilisez « Réémettre la clé »' using errcode = 'P0001';
  end if;
  perform cle_sur_place(a, p_lat, p_lon, p_acc);
  update cles set statut = 'annulee', code_hash = null where annonce_id = a.id and statut = 'en_attente';
  insert into cles (annonce_id, agent_hash, code_hash, code_but, code_exp, loyer, avance, caution, bail_mois)
  values (a.id, h, digest(c, 'sha256'), 'remise', now() + interval '20 minutes', a.loyer, a.avance, a.caution, coalesce(a.bail_mois, 12))
  returning id into v;
  perform cle_noter(v, 'agent', 'Remise des clés préparée au logement', p_lat, p_lon);
  return jsonb_build_object('id', v, 'code', c, 'exp', now() + interval '20 minutes');
end $$;

-- l'agent réémet la clé (le locataire a perdu son téléphone ET son code de secours) : au logement, même numéro
create or replace function public.cle_reemettre(p_secret uuid, p_cle uuid, p_lat float8, p_lon float8, p_acc real) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); k cles; a annonces; c text := cle_code();
begin
  select * into k from cles where id = p_cle and agent_hash = h and statut = 'active';
  if not found then raise exception 'Clé introuvable' using errcode = 'P0001'; end if;
  select * into a from annonces where id = k.annonce_id;
  perform cle_sur_place(a, p_lat, p_lon, p_acc);
  update cles set code_hash = digest(c, 'sha256'), code_but = 'reemission', code_exp = now() + interval '20 minutes' where id = k.id;
  perform cle_noter(k.id, 'agent', 'Réémission de la clé préparée au logement', p_lat, p_lon);
  return jsonb_build_object('id', k.id, 'code', c, 'exp', now() + interval '20 minutes');
end $$;

-- le locataire, au logement, prépare la restitution : renvoie le code à donner à l'agent
create or replace function public.cle_restitution_preparer(p_secret uuid, p_cle uuid, p_lat float8, p_lon float8, p_acc real) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); k cles; a annonces; c text := cle_code();
begin
  select * into k from cles where id = p_cle and client_hash = h and statut = 'active';
  if not found then raise exception 'Clé introuvable' using errcode = 'P0001'; end if;
  select * into a from annonces where id = k.annonce_id;
  perform cle_sur_place(a, p_lat, p_lon, p_acc);
  update cles set code_hash = digest(c, 'sha256'), code_but = 'restitution', code_exp = now() + interval '20 minutes' where id = k.id;
  perform cle_noter(k.id, 'locataire', 'Restitution des clés préparée au logement', p_lat, p_lon);
  return jsonb_build_object('id', k.id, 'code', c, 'exp', now() + interval '20 minutes');
end $$;

-- aperçu d'un code avant d'accepter : logement, conditions, contact (ne consomme pas le code)
create or replace function public.cle_apercu(p_secret uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); k cles; a annonces;
begin
  perform cle_frein(h);
  select * into k from cles where code_hash = digest(cle_norm(p_code), 'sha256') and code_exp > now() and statut in ('en_attente', 'active');
  -- un code faux est compté puis signalé par une réponse (une exception annulerait aussi le comptage)
  if not found then perform cle_essai(h, false); return jsonb_build_object('erreur', 'Code inconnu ou expiré'); end if;
  if (k.code_but = 'restitution') <> (k.agent_hash = h) then
    return jsonb_build_object('erreur', case when k.code_but = 'restitution' then 'Ce code de restitution doit être saisi par l''agent ou le propriétaire' else 'Ce code doit être saisi sur le téléphone du locataire' end);
  end if;
  select * into a from annonces where id = k.annonce_id;
  return jsonb_build_object('but', k.code_but, 'id', k.id, 'type', a.type, 'quartier', a.quartier, 'adresse', a.adresse, 'porte', a.porte, 'etage', a.etage,
    'chambres', a.chambres, 'sdb', a.sdb, 'lat', a.lat, 'lon', a.lon, 'loyer', k.loyer, 'avance', k.avance, 'caution', k.caution, 'bail_mois', k.bail_mois,
    'agent_nom', a.contact_nom, 'agent_tel', a.tel, 'role', a.role, 'client_nom', k.client_nom, 'remises', a.remises);
end $$;

-- valider un code : remise (locataire), réémission (locataire, nouveau téléphone), restitution (agent)
create or replace function public.cle_valider(p_secret uuid, p_code text, p_lat float8, p_lon float8, p_acc real,
  p_nom text default null, p_tel text default null, p_recup text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); k cles; a annonces; tel text := regexp_replace(coalesce(p_tel, ''), '\D', '', 'g');
begin
  perform cle_frein(h);
  select * into k from cles where code_hash = digest(cle_norm(p_code), 'sha256') and code_exp > now() and statut in ('en_attente', 'active') for update;
  if not found then perform cle_essai(h, false); return jsonb_build_object('erreur', 'Code inconnu ou expiré'); end if;
  select * into a from annonces where id = k.annonce_id for update;
  perform cle_sur_place(a, p_lat, p_lon, p_acc);
  if k.code_but in ('remise', 'reemission') then
    if k.agent_hash = h then raise exception 'L''agent ne peut pas recevoir sa propre clé : le code se saisit sur le téléphone du locataire' using errcode = 'P0001'; end if;
    if char_length(cle_norm(p_recup)) < 12 then raise exception 'Code de secours manquant' using errcode = 'P0001'; end if;
    if k.code_but = 'remise' then
      if char_length(btrim(coalesce(p_nom, ''))) < 2 then raise exception 'Indiquez votre nom' using errcode = 'P0001'; end if;
      if tel !~ '^[0-9]{10}$' then raise exception 'Numéro de téléphone invalide (10 chiffres)' using errcode = 'P0001'; end if;
      update cles set statut = 'active', client_hash = h, client_nom = btrim(p_nom), client_tel = tel, recup_hash = digest(cle_norm(p_recup), 'sha256'),
        debut = current_date, fin_prevue = (current_date + make_interval(months => coalesce(k.bail_mois, 12)))::date, code_hash = null, code_but = null, code_exp = null
        where id = k.id;
      update annonces set statut = 'occupee' where id = a.id;
      perform cle_compter_remises(k.agent_hash);
      perform cle_noter(k.id, 'locataire', format('Clés reçues : loyer %s F, avance %s mois, caution %s mois, bail %s mois — conditions acceptées',
        k.loyer, coalesce(k.avance, 0), coalesce(k.caution, 0), coalesce(k.bail_mois, 12)), p_lat, p_lon);
    else
      if tel <> k.client_tel then raise exception 'Ce numéro ne correspond pas à celui du locataire enregistré à la remise' using errcode = 'P0001'; end if;
      update cles set client_hash = h, recup_hash = digest(cle_norm(p_recup), 'sha256'), code_hash = null, code_but = null, code_exp = null where id = k.id;
      perform cle_noter(k.id, 'locataire', 'Clé réémise sur un nouveau téléphone (l''ancien est désactivé)', p_lat, p_lon);
    end if;
  else -- restitution
    if k.agent_hash <> h then raise exception 'Ce code de restitution doit être saisi par l''agent ou le propriétaire' using errcode = 'P0001'; end if;
    update cles set statut = 'restituee', fin_at = now(), code_hash = null, code_but = null, code_exp = null where id = k.id;
    update annonces set statut = 'retiree' where id = a.id;
    perform cle_compter_remises(k.agent_hash);
    perform cle_noter(k.id, 'agent', 'Clés restituées et récupérées par l''agent : logement libéré', p_lat, p_lon);
  end if;
  perform cle_essai(h, true);
  return jsonb_build_object('id', k.id, 'but', k.code_but);
end $$;

-- nouveau téléphone : le locataire récupère ses clés avec son code de secours (qui est aussitôt remplacé)
create or replace function public.cle_secours(p_secret uuid, p_recup text, p_new_recup text) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); n int;
begin
  perform cle_frein(h);
  if char_length(cle_norm(p_new_recup)) < 12 then raise exception 'Nouveau code de secours manquant' using errcode = 'P0001'; end if;
  with u as (update cles set client_hash = h, recup_hash = digest(cle_norm(p_new_recup), 'sha256')
             where statut = 'active' and recup_hash = digest(cle_norm(p_recup), 'sha256') returning id)
  select count(*) into n from u;
  if n = 0 then perform cle_essai(h, false); return 0; end if; -- 0 = code inconnu (l'essai raté reste compté)
  perform cle_essai(h, true);
  insert into cle_journal (cle_id, par, evenement) select id, 'locataire', 'Clé transférée sur un nouveau téléphone avec le code de secours (l''ancien est désactivé)'
    from cles where client_hash = h and statut = 'active' and recup_hash = digest(cle_norm(p_new_recup), 'sha256');
  return n;
end $$;

-- l'agent prolonge le bail (renouvellement) ; annule une demande de reprise en cours
create or replace function public.cle_prolonger(p_secret uuid, p_cle uuid, p_mois int) returns date
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); d date;
begin
  if p_mois not between 1 and 36 then raise exception 'Durée invalide' using errcode = 'P0001'; end if;
  update cles set fin_prevue = (greatest(fin_prevue, current_date) + make_interval(months => p_mois))::date, reprise_demandee_at = null
    where id = p_cle and agent_hash = h and statut = 'active' returning fin_prevue into d;
  if d is null then raise exception 'Clé introuvable' using errcode = 'P0001'; end if;
  perform cle_noter(p_cle, 'agent', format('Bail prolongé de %s mois, jusqu''au %s', p_mois, to_char(d, 'DD/MM/YYYY')));
  return d;
end $$;

-- reprise sans le locataire : demande, puis exécution après la fin du bail ET 30 jours sans contestation
create or replace function public.cle_reprise(p_secret uuid, p_cle uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); k cles; effet date;
begin
  select * into k from cles where id = p_cle and agent_hash = h and statut = 'active' for update;
  if not found then raise exception 'Clé introuvable' using errcode = 'P0001'; end if;
  if k.reprise_demandee_at is null or (k.contestee_at is not null and k.contestee_at > k.reprise_demandee_at) then
    if k.contestee_at is not null and k.reprise_demandee_at is not null and k.contestee_at > k.reprise_demandee_at then
      raise exception 'Le locataire a contesté la reprise : la restitution doit se faire ensemble, au logement' using errcode = 'P0001';
    end if;
    update cles set reprise_demandee_at = now() where id = k.id;
    effet := greatest(k.fin_prevue, (current_date + 30));
    perform cle_noter(k.id, 'agent', format('Reprise du logement demandée, possible à partir du %s si le locataire ne conteste pas', to_char(effet, 'DD/MM/YYYY')));
    return jsonb_build_object('etat', 'demandee', 'effet', effet);
  end if;
  effet := greatest(k.fin_prevue, (k.reprise_demandee_at + interval '30 days')::date);
  if current_date < effet then raise exception 'Reprise possible à partir du %', to_char(effet, 'DD/MM/YYYY') using errcode = 'P0001'; end if;
  update cles set statut = 'reprise', fin_at = now() where id = k.id;
  update annonces set statut = 'retiree' where id = k.annonce_id;
  perform cle_noter(k.id, 'agent', 'Logement repris après la fin du bail et 30 jours sans réponse du locataire');
  return jsonb_build_object('etat', 'reprise');
end $$;

create or replace function public.cle_contester(p_secret uuid, p_cle uuid) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256');
begin
  update cles set contestee_at = now() where id = p_cle and client_hash = h and statut = 'active' and reprise_demandee_at is not null;
  if not found then return false; end if;
  perform cle_noter(p_cle, 'locataire', 'Reprise contestée : le locataire occupe toujours le logement');
  return true;
end $$;

create or replace function public.cle_annuler(p_secret uuid, p_cle uuid) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256');
begin
  update cles set statut = case when statut = 'en_attente' then 'annulee' else statut end, code_hash = null, code_but = null, code_exp = null
    where id = p_cle and (agent_hash = h or client_hash = h) and code_hash is not null;
  if not found then return false; end if;
  perform cle_noter(p_cle, case when (select agent_hash from cles where id = p_cle) = h then 'agent' else 'locataire' end, 'Code annulé');
  return true;
end $$;

-- mes clés (comme agent ou comme locataire), avec le journal
create or replace function public.mes_cles(p_secret uuid) returns jsonb
language sql security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) from (
    select jsonb_build_object('id', k.id, 'role', case when k.agent_hash = digest(p_secret::text, 'sha256') then 'agent' else 'locataire' end,
      'statut', k.statut, 'code_but', case when k.code_exp > now() then k.code_but end, 'code_exp', case when k.code_exp > now() then k.code_exp end,
      'annonce_id', a.id, 'type', a.type, 'quartier', a.quartier, 'adresse', a.adresse, 'porte', a.porte, 'etage', a.etage, 'lat', a.lat, 'lon', a.lon,
      'loyer', k.loyer, 'avance', k.avance, 'caution', k.caution, 'bail_mois', k.bail_mois, 'debut', k.debut, 'fin_prevue', k.fin_prevue, 'fin_at', k.fin_at,
      'reprise_demandee_at', k.reprise_demandee_at, 'contestee_at', k.contestee_at, 'created_at', k.created_at,
      'agent_nom', a.contact_nom, 'agent_tel', a.tel,
      'client_nom', case when k.agent_hash = digest(p_secret::text, 'sha256') then k.client_nom end,
      'client_tel', case when k.agent_hash = digest(p_secret::text, 'sha256') then k.client_tel end,
      'journal', (select coalesce(jsonb_agg(jsonb_build_object('at', j.at, 'par', j.par, 'ev', j.evenement) order by j.at desc), '[]') from cle_journal j where j.cle_id = k.id)) x
    from cles k join annonces a on a.id = k.annonce_id
    where (k.agent_hash = digest(p_secret::text, 'sha256') and k.statut <> 'annulee') or k.client_hash = digest(p_secret::text, 'sha256')
  ) t;
$$;

do $$
declare f text;
begin
  foreach f in array array['annonce_publier(uuid, jsonb)', 'annonce_photo(uuid, uuid, int, text)', 'annonce_statut(uuid, uuid, text)',
    'mes_annonces(uuid)', 'annonce_signaler(uuid, uuid, text)', 'mes_annonces_supprimer(uuid)',
    'cle_preparer(uuid, uuid, double precision, double precision, real)', 'cle_reemettre(uuid, uuid, double precision, double precision, real)',
    'cle_restitution_preparer(uuid, uuid, double precision, double precision, real)', 'cle_apercu(uuid, text)',
    'cle_valider(uuid, text, double precision, double precision, real, text, text, text)', 'cle_secours(uuid, text, text)',
    'annonce_detail(uuid, uuid)', 'annonce_modifier(uuid, uuid, jsonb)', 'annonce_photos_garder(uuid, uuid, int)',
    'cle_prolonger(uuid, uuid, int)', 'cle_reprise(uuid, uuid)', 'cle_contester(uuid, uuid)', 'cle_annuler(uuid, uuid)', 'mes_cles(uuid)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

-- fonctions internes : jamais appelables directement depuis l'application
do $$
declare f text;
begin
  foreach f in array array['cle_essai(bytea, boolean)', 'cle_frein(bytea)', 'cle_noter(uuid, text, text, double precision, double precision)',
    'cle_compter_remises(bytea)', 'cle_sur_place(annonces, double precision, double precision, real)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
