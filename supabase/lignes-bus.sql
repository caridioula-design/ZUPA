-- ZUPA — mise à jour 3 : nouveaux bus ajoutés par les utilisateurs + ajout d'arrêts après coup.
-- À exécuter une fois dans Supabase › SQL Editor (ré-exécutable sans risque), après v2.sql.

-- 1. type « bus » : le numéro est enregistré dans la colonne gare (1 à 6 caractères)
alter table public.lignes drop constraint if exists lignes_type_check;
alter table public.lignes add constraint lignes_type_check check (type in ('bus', 'gbaka', 'woro', 'saloni'));
alter table public.lignes drop constraint if exists lignes_gare_check;
alter table public.lignes add constraint lignes_gare_check check (
  case when type = 'bus' then gare ~ '^[0-9A-Z]{1,6}$' else char_length(btrim(gare)) between 2 and 60 end);

-- 2. modifier sa ligne (ajouter des arrêts, corriger le tarif) : seulement l'appareil qui l'a créée
create or replace function public.ligne_modifier(p_id uuid, p_device uuid, p jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare a jsonb; t text;
begin
  select type into t from lignes where id = p_id and device = p_device;
  if not found then raise exception 'Ligne introuvable' using errcode = 'P0001'; end if;
  if jsonb_typeof(p->'arrets') <> 'array' or jsonb_array_length(p->'arrets') not between 2 and 60 then
    raise exception 'Arrêts invalides' using errcode = 'P0001';
  end if;
  for a in select * from jsonb_array_elements(p->'arrets') loop
    if char_length(btrim(coalesce(a->>'name', ''))) not between 2 and 60
       or (a->>'lat')::double precision not between 4 and 11 or (a->>'lon')::double precision not between -9 and -2 then
      raise exception 'Arrêt invalide dans la ligne' using errcode = 'P0001';
    end if;
  end loop;
  update lignes set
    gare  = case when t = 'bus' then gare else coalesce(nullif(btrim(p->>'gare'), ''), gare) end,
    nom   = left(nullif(btrim(p->>'nom'), ''), 80),
    tarif = case when p->>'tarif' ~ '^\d{1,5}$' and (p->>'tarif')::int <= 10000 then (p->>'tarif')::int else null end,
    arrets = p->'arrets'
  where id = p_id and device = p_device;
  return true;
end $$;
revoke all on function public.ligne_modifier(uuid, uuid, jsonb) from public;
grant execute on function public.ligne_modifier(uuid, uuid, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
