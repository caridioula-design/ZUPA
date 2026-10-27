-- =====================================================================
-- ZUPA — régie publicitaire (démo) : panneaux publicitaires virtuels
-- À exécuter dans Supabase › SQL Editor › New query › coller › Run. Ré-exécutable sans risque
-- (remplace aussi la première version « commerciaux / administrateur »).
--
-- Principe :
--  * chaque utilisateur crée lui-même la publicité de son commerce, depuis l'application ;
--  * la campagne est un « panneau virtuel » posé au point de vente (position GPS prise sur place) ;
--  * à moins de rayon_m (500 m par défaut) d'un point de vente, on ne voit que ses pubs ;
--    ailleurs, les campagnes « toute la ville » et celles proches ;
--  * DÉMO : les campagnes sont diffusées tout de suite et gratuitement. Plus tard, pour qu'elles soient
--    vérifiées avant diffusion :  update public.regie_config set valeur = 'oui' where cle = 'validation';
--    puis, pour en autoriser une :  update public.campagnes set statut = 'active' where id = '…';
--  * la position des utilisateurs ne quitte jamais le téléphone ; seules des statistiques additionnées
--    par jour remontent. L'auteur d'une campagne n'est identifié que par l'empreinte de son secret.
-- =====================================================================
create extension if not exists pgcrypto;

create table if not exists public.regie_config (cle text primary key, valeur text not null);
insert into public.regie_config values ('validation', 'non'), ('demo', 'oui') on conflict (cle) do nothing;
alter table public.regie_config enable row level security;
revoke all on public.regie_config from anon, authenticated;
grant select on public.regie_config to anon, authenticated;
drop policy if exists regie_config_lecture on public.regie_config;
create policy regie_config_lecture on public.regie_config for select to anon, authenticated using (true);

-- ---------- tarifs (affichés à titre indicatif pendant la démo ; modifiables dans Table Editor) ----------
create table if not exists public.regie_tarifs (
  formule text primary key,
  libelle text not null,
  jours   int not null check (jours between 1 and 366),
  prix    int not null check (prix >= 0),
  ordre   int not null default 0
);
insert into public.regie_tarifs (formule, libelle, jours, prix, ordre) values
  ('quartier7',  'Quartier · 7 jours',        7,  15000, 1),
  ('quartier30', 'Quartier · 30 jours',       30,  45000, 2),
  ('ville30',    'Toute la ville · 30 jours', 30, 150000, 3)
on conflict (formule) do nothing;
create table if not exists public.regie_options (cle text primary key, pourcent int not null);
insert into public.regie_options values ('rayon1000', 30), ('rayon200', -20), ('exclusif', 50) on conflict (cle) do nothing;
alter table public.regie_tarifs enable row level security;
alter table public.regie_options enable row level security;
revoke all on public.regie_tarifs, public.regie_options from anon, authenticated;
grant select on public.regie_tarifs, public.regie_options to anon, authenticated;
drop policy if exists regie_tarifs_lecture on public.regie_tarifs;
create policy regie_tarifs_lecture on public.regie_tarifs for select to anon, authenticated using (true);
drop policy if exists regie_options_lecture on public.regie_options;
create policy regie_options_lecture on public.regie_options for select to anon, authenticated using (true);

-- ---------- campagnes ----------
create table if not exists public.campagnes (
  id          uuid primary key default gen_random_uuid(),
  owner_hash  bytea,
  commerce    text not null check (char_length(btrim(commerce)) between 2 and 60),
  cat         text not null default 'shop',
  tel         text check (tel is null or tel ~ '^[0-9]{10}$'),
  whatsapp    boolean not null default true,
  lat         double precision not null check (lat between 4.3 and 10.8),
  lon         double precision not null check (lon between -8.7 and -2.4),
  gps_acc     real not null check (gps_acc > 0 and gps_acc <= 60),
  rayon_m     int not null default 500 check (rayon_m in (200, 500, 1000)),
  exclusif    boolean not null default false,
  formule     text not null references public.regie_tarifs (formule),
  debut       date not null default current_date,
  fin         date not null,
  modele      text not null default 'promo',
  titre       text not null check (char_length(btrim(titre)) between 1 and 40),
  sous_titre  text check (char_length(sous_titre) <= 60),
  accroche    text check (char_length(accroche) <= 14),
  cta         text not null default 'appel' check (cta in ('appel', 'whatsapp', 'itineraire')),
  couleur     text not null default 'jaune',
  image       text,
  statut      text not null default 'active',
  prix        int not null default 0,
  paye        boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (fin >= debut)
);
-- mise à niveau depuis la première version (commerciaux / administrateur)
alter table public.campagnes add column if not exists owner_hash bytea;
alter table public.campagnes drop constraint if exists campagnes_modele_check;
alter table public.campagnes add constraint campagnes_modele_check check (modele in ('promo', 'produit', 'resto', 'service', 'visuel'));
alter table public.campagnes drop constraint if exists campagnes_image_check;
alter table public.campagnes add constraint campagnes_image_check check (image is null or (char_length(image) < 600000 and (image like 'data:image/jpeg;base64,%' or image like 'data:image/png;base64,%')));
alter table public.campagnes drop constraint if exists campagnes_statut_check;
alter table public.campagnes add constraint campagnes_statut_check check (statut in ('a_valider', 'active', 'pause', 'refusee'));
alter table public.campagnes drop constraint if exists campagnes_cat_check;
alter table public.campagnes add constraint campagnes_cat_check check (cat in ('resto', 'maquis', 'shop', 'supermarche', 'marche', 'hotel', 'station', 'pharma', 'sante', 'service', 'autre'));
alter table public.campagnes drop constraint if exists campagnes_couleur_check;
alter table public.campagnes add constraint campagnes_couleur_check check (couleur in ('jaune', 'orange', 'rouge', 'vert', 'bleu', 'violet', 'noir'));
alter table public.campagnes alter column titre drop not null;
-- contrôles de texte tolérants (une ancienne version exigeait un titre de 2 caractères minimum)
alter table public.campagnes drop constraint if exists campagnes_titre_check;
alter table public.campagnes add constraint campagnes_titre_check check (titre is null or char_length(titre) <= 40);
alter table public.campagnes drop constraint if exists campagnes_sous_titre_check;
alter table public.campagnes add constraint campagnes_sous_titre_check check (sous_titre is null or char_length(sous_titre) <= 60);
alter table public.campagnes drop constraint if exists campagnes_accroche_check;
alter table public.campagnes add constraint campagnes_accroche_check check (accroche is null or char_length(accroche) <= 14);
create index if not exists campagnes_actives on public.campagnes (fin) where statut = 'active';
create index if not exists campagnes_owner on public.campagnes (owner_hash);
alter table public.campagnes enable row level security;
revoke all on public.campagnes from anon, authenticated;
grant select (id, commerce, cat, tel, whatsapp, lat, lon, rayon_m, exclusif, formule, debut, fin, modele, titre, sous_titre, accroche, cta, couleur, image)
  on public.campagnes to anon, authenticated;
drop policy if exists campagnes_lecture on public.campagnes;
create policy campagnes_lecture on public.campagnes for select to anon, authenticated
  using (statut = 'active' and paye and current_date between debut and fin);

create table if not exists public.campagne_stats (
  campagne_id uuid not null references public.campagnes (id) on delete cascade,
  jour        date not null default current_date,
  vues        int not null default 0,
  touchers    int not null default 0,
  appels      int not null default 0,
  itineraires int not null default 0,
  visites     int not null default 0,
  primary key (campagne_id, jour)
);
alter table public.campagne_stats enable row level security;
revoke all on public.campagne_stats from anon, authenticated;

-- ancienne version : fonctions commerciaux / administrateur retirées
drop function if exists public.regie_role(text);
drop function if exists public.commercial_ajouter(text, text, text);
drop function if exists public.commercial_desactiver(text, text);
drop function if exists public.commerciaux_liste(text);
drop function if exists public.campagne_enregistrer(text, jsonb);
drop function if exists public.campagne_action(text, uuid, text, text);
drop function if exists public.campagnes_liste(text);
drop function if exists public.campagne_image(text, uuid);
drop function if exists public.campagne_stats_jours(text, uuid);

create or replace function public.regie_prix(p_formule text, p_rayon int, p_exclusif boolean) returns int
language sql stable security definer set search_path = public as $$
  select round(t.prix * (100 + coalesce((select pourcent from regie_options where cle = 'rayon' || p_rayon), 0)
    + case when p_exclusif then coalesce((select pourcent from regie_options where cle = 'exclusif'), 0) else 0 end) / 100.0)::int
  from regie_tarifs t where t.formule = p_formule;
$$;

-- créer ou modifier SA campagne
create or replace function public.campagne_publier(p_secret uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); v uuid := nullif(p->>'id', '')::uuid; t regie_tarifs; deb date; k campagnes;
  valide boolean := coalesce((select valeur from regie_config where cle = 'validation'), 'non') = 'oui';
begin
  if p->>'lat' is null or p->>'lon' is null or p->>'gps_acc' is null then raise exception 'Localisez le point de vente par GPS, sur place' using errcode = 'P0001'; end if;
  if (p->>'gps_acc')::real > 60 then raise exception 'Signal GPS trop imprécis (± % m) : 60 m au plus', round((p->>'gps_acc')::numeric) using errcode = 'P0001'; end if;
  select * into t from regie_tarifs where formule = p->>'formule';
  if not found then raise exception 'Formule inconnue' using errcode = 'P0001'; end if;
  if coalesce(p->>'modele', 'promo') = 'visuel' and coalesce(p->>'image', '') = '' and v is null then raise exception 'Ajoutez le visuel de la publicité' using errcode = 'P0001'; end if;
  if v is null and (select count(*) from campagnes where owner_hash = h and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Limite atteinte : 5 campagnes par jour' using errcode = 'P0001';
  end if;
  if coalesce((p->>'exclusif')::boolean, false) and exists (select 1 from campagnes c where c.exclusif and c.statut in ('active', 'a_valider')
      and c.fin >= current_date and c.id is distinct from v
      and 111320 * sqrt(power(c.lat - (p->>'lat')::float8, 2) + power((c.lon - (p->>'lon')::float8) * cos(radians(c.lat)), 2)) < c.rayon_m + coalesce((p->>'rayon_m')::int, 500)) then
    raise exception 'Un autre commerce a déjà l''exclusivité de cette zone' using errcode = 'P0001';
  end if;
  deb := greatest(current_date, coalesce((p->>'debut')::date, current_date));
  if v is null then
    insert into campagnes (owner_hash, commerce, cat, tel, whatsapp, lat, lon, gps_acc, rayon_m, exclusif, formule, debut, fin, modele, titre, sous_titre, accroche, cta, couleur, image, statut, prix, paye)
    values (h, btrim(p->>'commerce'), coalesce(p->>'cat', 'shop'), nullif(regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g'), ''), coalesce((p->>'whatsapp')::boolean, true),
      (p->>'lat')::float8, (p->>'lon')::float8, (p->>'gps_acc')::real, coalesce((p->>'rayon_m')::int, 500), coalesce((p->>'exclusif')::boolean, false),
      t.formule, deb, deb + t.jours - 1, coalesce(p->>'modele', 'promo'), left(nullif(btrim(p->>'titre'), ''), 40), left(nullif(btrim(p->>'sous_titre'), ''), 60), left(nullif(btrim(p->>'accroche'), ''), 14),
      coalesce(p->>'cta', 'appel'), coalesce(p->>'couleur', 'jaune'), nullif(p->>'image', ''),
      case when valide then 'a_valider' else 'active' end, regie_prix(t.formule, coalesce((p->>'rayon_m')::int, 500), coalesce((p->>'exclusif')::boolean, false)), true)
    returning id into v;
  else
    select * into k from campagnes where id = v and owner_hash = h;
    if not found then raise exception 'Campagne introuvable' using errcode = 'P0001'; end if;
    update campagnes set commerce = btrim(p->>'commerce'), cat = coalesce(p->>'cat', cat), tel = nullif(regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g'), ''),
      whatsapp = coalesce((p->>'whatsapp')::boolean, whatsapp), lat = (p->>'lat')::float8, lon = (p->>'lon')::float8, gps_acc = (p->>'gps_acc')::real,
      rayon_m = coalesce((p->>'rayon_m')::int, rayon_m), exclusif = coalesce((p->>'exclusif')::boolean, exclusif),
      modele = coalesce(p->>'modele', modele), titre = left(nullif(btrim(p->>'titre'), ''), 40), sous_titre = left(nullif(btrim(p->>'sous_titre'), ''), 60), accroche = left(nullif(btrim(p->>'accroche'), ''), 14),
      cta = coalesce(p->>'cta', cta), couleur = coalesce(p->>'couleur', couleur), image = case when p ? 'image' then nullif(p->>'image', '') else image end,
      statut = case when valide and statut = 'active' then 'a_valider' else statut end, updated_at = now()
    where id = v;
  end if;
  return v;
end $$;

create or replace function public.mes_campagnes(p_secret uuid) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(to_jsonb(c) - 'image' - 'owner_hash' || jsonb_build_object('a_image', c.image is not null,
      'stats', (select jsonb_build_object('vues', coalesce(sum(s.vues), 0), 'touchers', coalesce(sum(s.touchers), 0), 'appels', coalesce(sum(s.appels), 0),
         'itineraires', coalesce(sum(s.itineraires), 0), 'visites', coalesce(sum(s.visites), 0)) from campagne_stats s where s.campagne_id = c.id))
    order by c.created_at desc), '[]')
  from campagnes c where c.owner_hash = digest(p_secret::text, 'sha256');
$$;
create or replace function public.ma_campagne_image(p_secret uuid, p_id uuid) returns text
language sql stable security definer set search_path = public, extensions as $$
  select image from campagnes where id = p_id and owner_hash = digest(p_secret::text, 'sha256');
$$;
create or replace function public.ma_campagne_stats(p_secret uuid, p_id uuid) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(to_jsonb(s) - 'campagne_id' order by s.jour), '[]') from campagne_stats s join campagnes c on c.id = s.campagne_id
  where s.campagne_id = p_id and c.owner_hash = digest(p_secret::text, 'sha256');
$$;
-- pause, reprise, prolongation, suppression (par son auteur)
create or replace function public.ma_campagne(p_secret uuid, p_id uuid, p_action text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h bytea := digest(p_secret::text, 'sha256'); t regie_tarifs; k campagnes;
begin
  select * into k from campagnes where id = p_id and owner_hash = h;
  if not found then raise exception 'Campagne introuvable' using errcode = 'P0001'; end if;
  if p_action = 'pause' then update campagnes set statut = 'pause', updated_at = now() where id = p_id and statut = 'active';
  elsif p_action = 'reprendre' then update campagnes set statut = 'active', updated_at = now() where id = p_id and statut = 'pause';
  elsif p_action = 'prolonger' then select * into t from regie_tarifs where formule = k.formule; update campagnes set fin = greatest(fin, current_date) + t.jours, updated_at = now() where id = p_id;
  elsif p_action = 'supprimer' then delete from campagnes where id = p_id;
  else raise exception 'Action inconnue' using errcode = 'P0001'; end if;
  return true;
end $$;

create or replace function public.pub_compter(p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare e jsonb; n int := 0;
begin
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 40 then return 0; end if;
  for e in select * from jsonb_array_elements(p) loop
    if not exists (select 1 from campagnes where id = (e->>'id')::uuid and statut = 'active') then continue; end if;
    insert into campagne_stats (campagne_id, jour, vues, touchers, appels, itineraires, visites)
    values ((e->>'id')::uuid, current_date, least(greatest(coalesce((e->>'v')::int, 0), 0), 50), least(greatest(coalesce((e->>'t')::int, 0), 0), 20),
      least(greatest(coalesce((e->>'a')::int, 0), 0), 10), least(greatest(coalesce((e->>'i')::int, 0), 0), 10), least(greatest(coalesce((e->>'p')::int, 0), 0), 5))
    on conflict (campagne_id, jour) do update set vues = campagne_stats.vues + excluded.vues, touchers = campagne_stats.touchers + excluded.touchers,
      appels = campagne_stats.appels + excluded.appels, itineraires = campagne_stats.itineraires + excluded.itineraires, visites = campagne_stats.visites + excluded.visites;
    n := n + 1;
  end loop;
  return n;
end $$;

do $$
declare f text;
begin
  foreach f in array array['regie_prix(text, int, boolean)', 'campagne_publier(uuid, jsonb)', 'mes_campagnes(uuid)', 'ma_campagne_image(uuid, uuid)',
    'ma_campagne_stats(uuid, uuid)', 'ma_campagne(uuid, uuid, text)', 'pub_compter(jsonb)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
