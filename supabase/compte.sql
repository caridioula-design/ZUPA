-- ZUPA — Comptes Google / Facebook : sauvegarde et restauration des données de l'application.
-- À exécuter une fois dans Supabase › SQL Editor (sans risque si relancé).
-- Chaque utilisateur connecté ne peut lire / écrire QUE sa propre sauvegarde (auth.uid()).
-- La sauvegarde contient les préférences de l'application (prénom, favoris, secret de l'appareil…),
-- jamais la position ; les lieux confidentiels seulement si l'utilisateur coche l'option.

create table if not exists public.sauvegardes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  device     text,
  updated_at timestamptz not null default now(),
  constraint sauvegardes_taille check (octet_length(data::text) < 1000000)
);
alter table public.sauvegardes enable row level security;
revoke all on public.sauvegardes from anon, authenticated;
drop policy if exists sauvegardes_proprio on public.sauvegardes;
create policy sauvegardes_proprio on public.sauvegardes for select to authenticated using (user_id = auth.uid());

create or replace function public.compte_lire()
returns table (data jsonb, device text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.data, s.device, s.updated_at from public.sauvegardes s where s.user_id = auth.uid();
$$;

create or replace function public.compte_sauver(p_data jsonb, p_device text default null)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '28000'; end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'Format invalide'; end if;
  insert into public.sauvegardes (user_id, data, device, updated_at)
  values (auth.uid(), p_data, left(p_device, 64), now())
  on conflict (user_id) do update set data = excluded.data, device = excluded.device, updated_at = now()
  returning sauvegardes.updated_at into t;
  return t;
end $$;

create or replace function public.compte_effacer()
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '28000'; end if;
  delete from public.sauvegardes where user_id = auth.uid();
  return true;
end $$;

revoke all on function public.compte_lire() from public, anon;
revoke all on function public.compte_sauver(jsonb, text) from public, anon;
revoke all on function public.compte_effacer() from public, anon;
grant execute on function public.compte_lire() to authenticated;
grant execute on function public.compte_sauver(jsonb, text) to authenticated;
grant execute on function public.compte_effacer() to authenticated;

notify pgrst, 'reload schema';
