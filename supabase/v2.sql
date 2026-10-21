-- =====================================================================
-- ZUPA — mise à jour 2 : nouvelles catégories de lieux, lignes Gbaka / Wôrô-wôrô / Saloni,
-- pharmacies de garde ajoutées par l'administrateur.
-- À exécuter dans Supabase (SQL Editor › New query › coller › Run), après les autres scripts.
-- Ré-exécutable sans risque.
-- =====================================================================

-- ---------- 1. Nouvelles catégories de lieux ----------
alter table public.lieux drop constraint if exists lieux_cat_check;
alter table public.lieux add constraint lieux_cat_check check (cat in
  ('resto', 'maquis', 'hotel', 'wc', 'station', 'shop', 'supermarche', 'marche', 'culte', 'pharma', 'sante'));
-- santé et lieux de culte ne sont jamais comptés dans les visites (données sensibles)
alter table public.visites drop constraint if exists visites_cat_check;
alter table public.visites add constraint visites_cat_check check (cat in
  ('resto', 'maquis', 'hotel', 'wc', 'station', 'shop', 'supermarche', 'marche'));
alter table public.publications drop constraint if exists publications_cat_check;
alter table public.publications add constraint publications_cat_check check (cat in
  ('resto', 'maquis', 'hotel', 'wc', 'station', 'shop', 'supermarche', 'marche', 'pharma', 'sante', 'autre'));

-- ---------- 2. Lignes ajoutées par les utilisateurs (Gbaka, Wôrô-wôrô, Saloni) ----------
create table if not exists public.lignes (
  id         uuid primary key,                                 -- créé par l'application (renvoi sans doublon)
  type       text not null check (type in ('gbaka', 'woro', 'saloni')),
  gare       text not null check (char_length(btrim(gare)) between 2 and 60),       -- nom de la gare de départ
  nom        text check (char_length(nom) <= 80),                                  -- ex. « Adjamé – Yopougon Selmer »
  tarif      int check (tarif between 0 and 10000),                                -- FCFA
  arrets     jsonb not null check (jsonb_typeof(arrets) = 'array' and jsonb_array_length(arrets) between 2 and 60),
  device     uuid not null,
  reports    int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lignes_created_idx on public.lignes (created_at desc);
alter table public.lignes enable row level security;
revoke all on public.lignes from anon, authenticated;
grant select (id, type, gare, nom, tarif, arrets, reports, created_at) on public.lignes to anon, authenticated;
grant insert (id, type, gare, nom, tarif, arrets, device) on public.lignes to anon, authenticated;
drop policy if exists lignes_lecture on public.lignes;
create policy lignes_lecture on public.lignes for select to anon, authenticated using (reports < 3);
drop policy if exists lignes_ajout on public.lignes;
create policy lignes_ajout on public.lignes for insert to anon, authenticated with check (true);

-- contrôles à l'ajout : 5 lignes par jour et par appareil ; chaque arrêt a un nom et une position en Côte d'Ivoire
create or replace function public.lignes_avant_ajout() returns trigger
language plpgsql security definer set search_path = public as $$
declare a jsonb;
begin
  if (select count(*) from lignes where device = new.device and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Trop de lignes ajoutées aujourd''hui. Réessayez demain.' using errcode = 'P0001';
  end if;
  for a in select * from jsonb_array_elements(new.arrets) loop
    if char_length(btrim(coalesce(a->>'name', ''))) not between 2 and 60
       or (a->>'lat')::double precision not between 4 and 11 or (a->>'lon')::double precision not between -9 and -2 then
      raise exception 'Arrêt invalide dans la ligne' using errcode = 'P0001';
    end if;
  end loop;
  new.reports := 0; new.created_at := now();
  return new;
end $$;
drop trigger if exists lignes_avant_ajout on public.lignes;
create trigger lignes_avant_ajout before insert on public.lignes for each row execute function public.lignes_avant_ajout();

create table if not exists public.lignes_signalements (
  ligne_id uuid not null references public.lignes (id) on delete cascade,
  device   uuid not null,
  primary key (ligne_id, device)
);
alter table public.lignes_signalements enable row level security;
revoke all on public.lignes_signalements from anon, authenticated;

create or replace function public.ligne_signaler(p_id uuid, p_device uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into lignes_signalements values (p_id, p_device) on conflict do nothing;
  update lignes set reports = (select count(*) from lignes_signalements where ligne_id = p_id) where id = p_id returning reports into n;
  return coalesce(n, 0);
end $$;
create or replace function public.ligne_supprimer(p_id uuid, p_device uuid) returns boolean
language sql security definer set search_path = public as $$
  with d as (delete from lignes where id = p_id and device = p_device returning 1) select exists (select 1 from d);
$$;

-- ---------- 3. Pharmacies de garde ajoutées par l'administrateur ----------
-- Votre code administrateur (choisissez-le et gardez-le secret), à créer une fois :
--   insert into public.admin_codes (code) values ('VOTRE-CODE-SECRET');
create table if not exists public.admin_codes (code text primary key check (char_length(code) >= 8));
alter table public.admin_codes enable row level security;
revoke all on public.admin_codes from anon, authenticated;

create table if not exists public.gardes_manuelles (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null check (char_length(btrim(nom)) between 2 and 80),
  commune    text check (char_length(commune) <= 60),
  adresse    text check (char_length(adresse) <= 160),
  tel        text check (char_length(tel) <= 30),
  lat        double precision check (lat between 4 and 11),
  lon        double precision check (lon between -9 and -2),
  du         date not null,
  au         date not null,
  created_at timestamptz not null default now(),
  check (au >= du and au - du <= 31)
);
alter table public.gardes_manuelles enable row level security;
revoke all on public.gardes_manuelles from anon, authenticated;
grant select (id, nom, commune, adresse, tel, lat, lon, du, au) on public.gardes_manuelles to anon, authenticated;
drop policy if exists gardes_manuelles_lecture on public.gardes_manuelles;
create policy gardes_manuelles_lecture on public.gardes_manuelles for select to anon, authenticated using (au >= current_date - 1);

create or replace function public.admin_ok(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_codes where code = p_code);
$$;
create or replace function public.garde_ajouter(p_code text, p_nom text, p_commune text, p_adresse text, p_tel text,
  p_lat double precision, p_lon double precision, p_du date, p_au date) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not admin_ok(p_code) then raise exception 'Code administrateur incorrect' using errcode = 'P0001'; end if;
  insert into gardes_manuelles (nom, commune, adresse, tel, lat, lon, du, au)
    values (btrim(p_nom), nullif(btrim(p_commune), ''), nullif(btrim(p_adresse), ''), nullif(btrim(p_tel), ''), p_lat, p_lon, p_du, p_au)
    returning id into v;
  return v;
end $$;
create or replace function public.garde_supprimer(p_code text, p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not admin_ok(p_code) then raise exception 'Code administrateur incorrect' using errcode = 'P0001'; end if;
  delete from gardes_manuelles where id = p_id;
  return found;
end $$;

-- ---------- droits ----------
do $$
declare f text;
begin
  foreach f in array array['ligne_signaler(uuid, uuid)', 'ligne_supprimer(uuid, uuid)', 'admin_ok(text)',
    'garde_ajouter(text, text, text, text, text, double precision, double precision, date, date)', 'garde_supprimer(text, uuid)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
revoke all on function public.lignes_avant_ajout() from public;
