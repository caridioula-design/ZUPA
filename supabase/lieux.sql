-- =====================================================================
-- ZUPA — base partagée des lieux ajoutés par les utilisateurs (Paiya)
-- À exécuter une fois dans Supabase : SQL Editor › New query › coller › Run.
-- Ré-exécutable sans risque.
-- =====================================================================

create table if not exists public.lieux (
  id          uuid primary key,                                   -- identifiant créé par l'application (envoi sans doublon)
  cat         text not null check (cat in ('hotel', 'resto', 'wc', 'shop')),
  name        text not null check (char_length(btrim(name)) between 2 and 80),
  sub         text check (char_length(sub) <= 80),                -- type précis : « Maquis », « Toilettes · payantes »…
  lat         double precision not null check (lat between 4.0 and 11.0),    -- Côte d'Ivoire
  lon         double precision not null check (lon between -9.0 and -2.0),
  acc         real check (acc between 0 and 1000),                -- précision GPS au moment de l'ajout (m)
  phone       text check (char_length(phone) <= 30),
  hours       text check (char_length(hours) <= 60),              -- format OpenStreetMap : « Mo-Su 07:00-22:00 », « 24/7 »
  note        text check (char_length(note) <= 200),
  fee         text check (fee in ('yes', 'no')),                  -- toilettes payantes ou non
  wheelchair  boolean,
  device      uuid not null,                                      -- appareil anonyme (jamais lisible par les autres)
  reports     int not null default 0,                             -- signalements reçus
  created_at  timestamptz not null default now()
);
create index if not exists lieux_created_idx on public.lieux (created_at desc);
create index if not exists lieux_device_idx on public.lieux (device, created_at desc);

create table if not exists public.signalements (
  lieu_id    uuid not null references public.lieux (id) on delete cascade,
  device     uuid not null,
  motif      text check (char_length(motif) <= 40),
  created_at timestamptz not null default now(),
  primary key (lieu_id, device)
);

alter table public.lieux enable row level security;
alter table public.signalements enable row level security;

-- Droits : lecture publique sans la colonne « device », ajout seulement ; ni modification ni suppression directe
revoke all on public.lieux from anon, authenticated;
revoke all on public.signalements from anon, authenticated;
grant select (id, cat, name, sub, lat, lon, acc, phone, hours, note, fee, wheelchair, reports, created_at) on public.lieux to anon, authenticated;
grant insert (id, cat, name, sub, lat, lon, acc, phone, hours, note, fee, wheelchair, device) on public.lieux to anon, authenticated;

drop policy if exists lieux_lecture on public.lieux;
create policy lieux_lecture on public.lieux for select to anon, authenticated using (reports < 3);   -- 3 signalements : le lieu est masqué
drop policy if exists lieux_ajout on public.lieux;
create policy lieux_ajout on public.lieux for insert to anon, authenticated with check (true);

-- Garde-fous à l'ajout : 10 lieux par heure et par appareil, compteurs remis à zéro, textes nettoyés
create or replace function public.lieux_avant_ajout() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from lieux where device = new.device and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Trop de lieux ajoutés en peu de temps. Réessayez plus tard.' using errcode = 'P0001';
  end if;
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.reports := 0;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists lieux_avant_ajout on public.lieux;
create trigger lieux_avant_ajout before insert on public.lieux for each row execute function public.lieux_avant_ajout();

-- Signaler un lieu (une fois par appareil) ; renvoie le nombre de signalements
create or replace function public.signaler_lieu(p_id uuid, p_device uuid, p_motif text default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into signalements (lieu_id, device, motif) values (p_id, p_device, left(p_motif, 40)) on conflict do nothing;
  update lieux set reports = (select count(*) from signalements where lieu_id = p_id) where id = p_id returning reports into n;
  return coalesce(n, 0);
end $$;

-- Supprimer un lieu que l'on a soi-même ajouté (même appareil)
create or replace function public.supprimer_lieu(p_id uuid, p_device uuid) returns boolean
language sql security definer set search_path = public as $$
  with d as (delete from lieux where id = p_id and device = p_device returning 1)
  select exists (select 1 from d);
$$;

revoke all on function public.signaler_lieu(uuid, uuid, text) from public;
revoke all on function public.supprimer_lieu(uuid, uuid) from public;
revoke all on function public.lieux_avant_ajout() from public;
grant execute on function public.signaler_lieu(uuid, uuid, text) to anon, authenticated;
grant execute on function public.supprimer_lieu(uuid, uuid) to anon, authenticated;
