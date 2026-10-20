-- =====================================================================
-- ZUPA — amis, partage de lieux entre amis, lieux les plus visités
-- À exécuter dans Supabase (SQL Editor › New query › coller › Run), après lieux.sql.
-- Ré-exécutable sans risque.
--
-- Confidentialité :
--  * aucune table n'est lisible directement : tout passe par les fonctions ci-dessous ;
--  * chaque téléphone a un secret aléatoire ; seule son empreinte (SHA-256) est stockée ;
--  * on ne trouve un utilisateur que par son code ami (pas de recherche par nom ni annuaire) ;
--  * les visites sont anonymes : identifiant différent chaque jour, aucun lien avec le profil,
--    et un lieu n'est publié qu'à partir de 3 visites.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profils (
  id          uuid primary key default gen_random_uuid(),
  secret_hash bytea not null unique,
  code        text not null unique,
  pseudo      text not null check (char_length(btrim(pseudo)) between 2 and 30),
  created_at  timestamptz not null default now(),
  seen_at     timestamptz not null default now()
);

create table if not exists public.amities (
  demandeur    uuid not null references public.profils (id) on delete cascade,
  destinataire uuid not null references public.profils (id) on delete cascade,
  statut       text not null default 'attente' check (statut in ('attente', 'ami')),
  created_at   timestamptz not null default now(),
  primary key (demandeur, destinataire),
  check (demandeur <> destinataire)
);

-- Blocages : la personne bloquée ne peut plus vous inviter ni vous envoyer de lieu, et ne voit plus votre pseudo
create table if not exists public.blocages (
  qui        uuid not null references public.profils (id) on delete cascade,
  bloque     uuid not null references public.profils (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (qui, bloque),
  check (qui <> bloque)
);

create table if not exists public.partages (
  id         uuid primary key default gen_random_uuid(),
  de         uuid not null references public.profils (id) on delete cascade,
  pour       uuid not null references public.profils (id) on delete cascade,
  nom        text not null check (char_length(btrim(nom)) between 1 and 80),
  cat        text check (char_length(cat) <= 20),
  lat        double precision not null check (lat between -90 and 90),
  lon        double precision not null check (lon between -180 and 180),
  note       text check (char_length(note) <= 200),
  lu         boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists partages_pour_idx on public.partages (pour, created_at desc);
-- « lieu » = un lieu envoyé ; « position » = « je suis ici » avec un message
alter table public.partages add column if not exists genre text not null default 'lieu' check (genre in ('lieu', 'position'));

create table if not exists public.visites (
  place_id text not null check (char_length(place_id) between 2 and 64),
  jour     date not null default current_date,
  vid      text not null check (vid ~ '^[0-9a-f]{64}$'),   -- empreinte (appareil + jour), change chaque jour
  cat      text not null check (cat in ('hotel', 'resto', 'wc', 'shop')),
  nom      text not null check (char_length(nom) between 1 and 80),
  lat      double precision not null check (lat between 4.0 and 11.0),
  lon      double precision not null check (lon between -9.0 and -2.0),
  primary key (place_id, jour, vid)
);
create index if not exists visites_jour_idx on public.visites (jour);

alter table public.profils enable row level security;
alter table public.amities enable row level security;
alter table public.partages enable row level security;
alter table public.visites enable row level security;
alter table public.blocages enable row level security;
revoke all on public.profils, public.amities, public.partages, public.visites, public.blocages from anon, authenticated;

-- ---------- outils internes ----------
create or replace function public.zupa_qui(p_secret uuid) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v uuid;
begin
  select id into v from profils where secret_hash = digest(p_secret::text, 'sha256');
  if v is null then raise exception 'Profil inconnu' using errcode = 'P0002'; end if;
  update profils set seen_at = now() where id = v and seen_at < now() - interval '1 hour';
  return v;
end $$;

-- ---------- profil ----------
-- Crée le profil au premier appel (avec un pseudo) ou change le pseudo ; renvoie le code ami
create or replace function public.zupa_moi(p_secret uuid, p_pseudo text default null)
returns table (code text, pseudo text)
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); c text; abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if not exists (select 1 from profils where secret_hash = h) then
    if p_pseudo is null then raise exception 'Choisissez un pseudo' using errcode = 'P0001'; end if;
    loop
      c := '';
      for i in 1..8 loop c := c || substr(abc, 1 + floor(random() * 32)::int, 1); end loop;
      c := substr(c, 1, 4) || '-' || substr(c, 5, 4);
      exit when not exists (select 1 from profils where profils.code = c);
    end loop;
    insert into profils (secret_hash, code, pseudo) values (h, c, btrim(p_pseudo));
  elsif p_pseudo is not null then
    update profils set pseudo = btrim(p_pseudo) where secret_hash = h;
  end if;
  return query select profils.code, profils.pseudo from profils where secret_hash = h;
end $$;

-- ---------- amis ----------
create or replace function public.ami_demander(p_secret uuid, p_code text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret); lui uuid;
begin
  select id into lui from profils where code = upper(btrim(p_code));
  if lui is null then return 'introuvable'; end if;
  if lui = moi then return 'soi_meme'; end if;
  -- blocage dans un sens ou dans l'autre : on ne révèle rien
  if exists (select 1 from blocages where (qui = lui and bloque = moi) or (qui = moi and bloque = lui)) then return 'introuvable'; end if;
  if exists (select 1 from amities where statut = 'ami' and ((demandeur = moi and destinataire = lui) or (demandeur = lui and destinataire = moi))) then return 'deja_amis'; end if;
  if exists (select 1 from amities where demandeur = lui and destinataire = moi) then      -- il m'avait déjà invité : on devient amis
    update amities set statut = 'ami' where demandeur = lui and destinataire = moi;
    return 'acceptee';
  end if;
  if (select count(*) from amities where demandeur = moi and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Trop de demandes aujourd''hui. Réessayez demain.' using errcode = 'P0001';
  end if;
  insert into amities (demandeur, destinataire) values (moi, lui) on conflict do nothing;
  return 'envoyee';
end $$;

create or replace function public.ami_repondre(p_secret uuid, p_code text, p_ok boolean) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret); lui uuid;
begin
  select id into lui from profils where code = upper(btrim(p_code));
  if lui is null then return false; end if;
  if p_ok then update amities set statut = 'ami' where demandeur = lui and destinataire = moi;
  else delete from amities where demandeur = lui and destinataire = moi and statut = 'attente'; end if;
  return found;
end $$;

-- Retire un ami, annule une demande envoyée ; les lieux échangés entre vous sont effacés
create or replace function public.ami_retirer(p_secret uuid, p_code text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret); lui uuid;
begin
  select id into lui from profils where code = upper(btrim(p_code));
  if lui is null then return false; end if;
  delete from amities where (demandeur = moi and destinataire = lui) or (demandeur = lui and destinataire = moi);
  delete from partages where (de = moi and pour = lui) or (de = lui and pour = moi);
  return true;
end $$;

create or replace function public.amis_liste(p_secret uuid)
returns table (code text, pseudo text, etat text)
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret);
begin
  return query
    select p.code, p.pseudo, case when a.statut = 'ami' then 'ami' when a.demandeur = moi then 'envoyee' else 'recue' end
    from amities a join profils p on p.id = case when a.demandeur = moi then a.destinataire else a.demandeur end
    where a.demandeur = moi or a.destinataire = moi
    order by a.statut desc, p.pseudo;
end $$;

-- Bloquer : retire l'amitié, les demandes et les lieux échangés
create or replace function public.ami_bloquer(p_secret uuid, p_code text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret); lui uuid;
begin
  select id into lui from profils where code = upper(btrim(p_code));
  if lui is null or lui = moi then return false; end if;
  delete from amities where (demandeur = moi and destinataire = lui) or (demandeur = lui and destinataire = moi);
  delete from partages where (de = moi and pour = lui) or (de = lui and pour = moi);
  insert into blocages (qui, bloque) values (moi, lui) on conflict do nothing;
  return true;
end $$;

create or replace function public.ami_debloquer(p_secret uuid, p_code text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret);
begin
  delete from blocages where qui = moi and bloque = (select id from profils where code = upper(btrim(p_code)));
  return found;
end $$;

create or replace function public.bloques_liste(p_secret uuid)
returns table (code text, pseudo text)
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret);
begin
  return query select p.code, p.pseudo from blocages b join profils p on p.id = b.bloque where b.qui = moi order by b.created_at desc;
end $$;

-- ---------- partage de lieux (uniquement entre amis) ----------
create or replace function public.lieu_partager(p_secret uuid, p_codes text[], p_nom text, p_cat text, p_lat double precision, p_lon double precision, p_note text default null)
returns int
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret); n int;
begin
  if (select count(*) from partages where de = moi and created_at > now() - interval '1 day') >= 60 then
    raise exception 'Trop de partages aujourd''hui. Réessayez demain.' using errcode = 'P0001';
  end if;
  insert into partages (de, pour, nom, cat, lat, lon, note)
    select moi, p.id, btrim(p_nom), p_cat, p_lat, p_lon, nullif(btrim(p_note), '')
    from profils p
    where p.code = any (select upper(btrim(x)) from unnest(p_codes) x)
      and exists (select 1 from amities a where a.statut = 'ami' and ((a.demandeur = moi and a.destinataire = p.id) or (a.demandeur = p.id and a.destinataire = moi)));
  get diagnostics n = row_count;
  return n;
end $$;

drop function if exists public.lieux_recus(uuid);
-- « Je suis ici » : position de l'expéditeur + message, envoyée à des amis
create or replace function public.position_partager(p_secret uuid, p_codes text[], p_message text, p_lat double precision, p_lon double precision, p_lieu text default null, p_cat text default null)
returns int
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret); n int;
begin
  if char_length(btrim(coalesce(p_message, ''))) not between 1 and 200 then
    raise exception 'Message vide ou trop long' using errcode = 'P0001';
  end if;
  if (select count(*) from partages where de = moi and created_at > now() - interval '1 day') >= 60 then
    raise exception 'Trop de partages aujourd''hui. Réessayez demain.' using errcode = 'P0001';
  end if;
  insert into partages (de, pour, nom, cat, lat, lon, note, genre)
    select moi, p.id, coalesce(nullif(left(btrim(p_lieu), 80), ''), 'Ma position'), left(p_cat, 20), p_lat, p_lon, btrim(p_message), 'position'
    from profils p
    where p.code = any (select upper(btrim(x)) from unnest(p_codes) x)
      and exists (select 1 from amities a where a.statut = 'ami' and ((a.demandeur = moi and a.destinataire = p.id) or (a.demandeur = p.id and a.destinataire = moi)));
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.lieux_recus(p_secret uuid)
returns table (id uuid, de_code text, de_pseudo text, nom text, cat text, lat double precision, lon double precision, note text, lu boolean, created_at timestamptz, genre text)
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret);
begin
  delete from partages where pour = moi and partages.created_at < now() - interval '90 days';
  return query
    select s.id, p.code, p.pseudo, s.nom, s.cat, s.lat, s.lon, s.note, s.lu, s.created_at, s.genre
    from partages s join profils p on p.id = s.de
    where s.pour = moi order by s.created_at desc limit 100;
end $$;

create or replace function public.lieu_recu_maj(p_secret uuid, p_id uuid, p_supprimer boolean default false) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare moi uuid := zupa_qui(p_secret);
begin
  if p_supprimer then delete from partages where id = p_id and pour = moi;
  else update partages set lu = true where id = p_id and pour = moi; end if;
  return found;
end $$;

-- ---------- lieux les plus visités (anonyme) ----------
create or replace function public.visite_ajouter(p_place text, p_vid text, p_cat text, p_nom text, p_lat double precision, p_lon double precision)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if (select count(*) from visites where vid = p_vid and jour = current_date) >= 30 then return false; end if;
  insert into visites (place_id, vid, cat, nom, lat, lon) values (p_place, p_vid, p_cat, left(btrim(p_nom), 80), p_lat, p_lon)
    on conflict do nothing;
  delete from visites where jour < current_date - 60;
  return found;
end $$;

create or replace function public.lieux_populaires(p_lat double precision, p_lon double precision, p_km double precision default 10)
returns table (place_id text, cat text, nom text, lat double precision, lon double precision, visites int)
language sql stable security definer set search_path = public as $$
  select v.place_id, max(v.cat), max(v.nom), avg(v.lat), avg(v.lon), count(*)::int
  from visites v
  where v.jour > current_date - 30
    and v.lat between p_lat - p_km / 111.0 and p_lat + p_km / 111.0
    and v.lon between p_lon - p_km / 110.0 and p_lon + p_km / 110.0
  group by v.place_id
  having count(*) >= 3
  order by count(*) desc
  limit 30;
$$;

-- ---------- effacer mes données en ligne ----------
create or replace function public.mes_donnees_supprimer(p_secret uuid, p_device uuid) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from profils where secret_hash = digest(p_secret::text, 'sha256');   -- amis et partages suivent (cascade)
  delete from lieux where device = p_device;
  return true;
end $$;

-- ---------- droits ----------
revoke all on function public.zupa_qui(uuid) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'zupa_moi(uuid, text)', 'ami_demander(uuid, text)', 'ami_repondre(uuid, text, boolean)', 'ami_retirer(uuid, text)',
    'amis_liste(uuid)', 'lieu_partager(uuid, text[], text, text, double precision, double precision, text)', 'lieux_recus(uuid)',
    'lieu_recu_maj(uuid, uuid, boolean)', 'position_partager(uuid, text[], text, double precision, double precision, text, text)', 'ami_bloquer(uuid, text)', 'ami_debloquer(uuid, text)', 'bloques_liste(uuid)', 'visite_ajouter(text, text, text, text, double precision, double precision)',
    'lieux_populaires(double precision, double precision, double precision)', 'mes_donnees_supprimer(uuid, uuid)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
