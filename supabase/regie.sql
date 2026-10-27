-- =====================================================================
-- ZUPA — régie publicitaire (version pilote) : panneaux publicitaires virtuels
-- À exécuter une fois dans Supabase › SQL Editor › New query › coller › Run, APRÈS v2.sql
-- (il utilise vos codes administrateur). Ré-exécutable sans risque.
--
-- Principe :
--  * chaque campagne est un « panneau virtuel » posé au point de vente (position GPS prise sur place) ;
--  * à moins de rayon_m (500 m par défaut) d'un point de vente, l'utilisateur ne voit que ses pubs ;
--  * ailleurs, il voit les campagnes « toute la ville » et celles proches de son trajet ;
--  * les commerciaux créent les campagnes avec leur code ; l'administrateur les valide avant diffusion ;
--  * la position des utilisateurs ne quitte jamais le téléphone : l'application télécharge les campagnes
--    actives et choisit elle-même ; seules des statistiques additionnées par jour remontent.
--
-- Créer un commercial (une fois par personne) :
--   select public.commercial_ajouter('VOTRE-CODE-ADMIN', 'Koffi Yao', 'KOFFI-2026');
-- Modifier les tarifs : Table Editor › regie_tarifs.
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- tarifs (modifiables dans Table Editor) ----------
create table if not exists public.regie_tarifs (
  formule text primary key,
  libelle text not null,
  jours   int not null check (jours between 1 and 366),
  prix    int not null check (prix >= 0),          -- FCFA, rayon 500 m
  ordre   int not null default 0
);
insert into public.regie_tarifs (formule, libelle, jours, prix, ordre) values
  ('quartier7',  'Quartier · 7 jours',       7,   15000, 1),
  ('quartier30', 'Quartier · 30 jours',      30,  45000, 2),
  ('ville30',    'Toute la ville · 30 jours', 30, 150000, 3)
on conflict (formule) do nothing;
-- majorations (en %) : rayon 1 km, exclusivité de la zone ; rayon 200 m : réduction
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

-- ---------- commerciaux ----------
create table if not exists public.commerciaux (
  code  text primary key check (char_length(code) >= 6),
  nom   text not null check (char_length(btrim(nom)) between 2 and 60),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.commerciaux enable row level security;
revoke all on public.commerciaux from anon, authenticated;

-- ---------- campagnes ----------
create table if not exists public.campagnes (
  id          uuid primary key default gen_random_uuid(),
  commerce    text not null check (char_length(btrim(commerce)) between 2 and 60),
  cat         text not null default 'shop' check (cat in ('resto', 'maquis', 'shop', 'supermarche', 'marche', 'hotel', 'station', 'pharma', 'sante', 'service', 'autre')),
  tel         text check (tel is null or tel ~ '^[0-9]{10}$'),          -- contact du commerce (affiché)
  whatsapp    boolean not null default true,
  lat         double precision not null check (lat between 4.3 and 10.8),
  lon         double precision not null check (lon between -8.7 and -2.4),
  gps_acc     real not null check (gps_acc > 0 and gps_acc <= 60),     -- point de vente localisé sur place
  rayon_m     int not null default 500 check (rayon_m in (200, 500, 1000)),
  exclusif    boolean not null default false,
  formule     text not null references public.regie_tarifs (formule),
  debut       date not null default current_date,
  fin         date not null,
  modele      text not null default 'promo' check (modele in ('promo', 'produit', 'resto', 'service')),
  titre       text not null check (char_length(btrim(titre)) between 2 and 40),
  sous_titre  text check (char_length(sous_titre) <= 60),
  accroche    text check (char_length(accroche) <= 14),                -- ex. « -35 % », « 1 000 F »
  cta         text not null default 'appel' check (cta in ('appel', 'whatsapp', 'itineraire')),
  couleur     text not null default 'jaune' check (couleur in ('jaune', 'orange', 'rouge', 'vert', 'bleu', 'violet', 'noir')),
  image       text check (image is null or (char_length(image) < 400000 and image like 'data:image/jpeg;base64,%')),
  statut      text not null default 'a_valider' check (statut in ('a_valider', 'active', 'pause', 'refusee')),
  motif_refus text check (char_length(motif_refus) <= 120),
  prix        int not null default 0,
  paiement    text check (char_length(paiement) <= 80),                -- ex. « Wave · réf. 123456 »
  paye        boolean not null default false,
  client_nom  text check (char_length(client_nom) <= 60),               -- gérant (non affiché)
  client_tel  text check (client_tel is null or client_tel ~ '^[0-9]{10}$'),
  commercial  text references public.commerciaux (code),               -- null = créée par l'administrateur
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (fin >= debut)
);
create index if not exists campagnes_actives on public.campagnes (fin) where statut = 'active';
alter table public.campagnes enable row level security;
revoke all on public.campagnes from anon, authenticated;
-- lecture publique : campagnes validées, payées et en cours ; jamais le prix, le paiement ni le gérant
grant select (id, commerce, cat, tel, whatsapp, lat, lon, rayon_m, exclusif, formule, debut, fin, modele, titre, sous_titre, accroche, cta, couleur, image)
  on public.campagnes to anon, authenticated;
drop policy if exists campagnes_lecture on public.campagnes;
create policy campagnes_lecture on public.campagnes for select to anon, authenticated
  using (statut = 'active' and paye and current_date between debut and fin);

-- ---------- statistiques : additions anonymes par jour ----------
create table if not exists public.campagne_stats (
  campagne_id uuid not null references public.campagnes (id) on delete cascade,
  jour        date not null default current_date,
  vues        int not null default 0,
  touchers    int not null default 0,
  appels      int not null default 0,
  itineraires int not null default 0,
  visites     int not null default 0,       -- passages à moins de 60 m du point de vente dans les 2 h après une vue
  primary key (campagne_id, jour)
);
alter table public.campagne_stats enable row level security;
revoke all on public.campagne_stats from anon, authenticated;

-- ---------- droits ----------
create or replace function public.regie_role(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from admin_codes where code = p_code) then jsonb_build_object('role', 'admin', 'nom', 'Administrateur')
    when exists (select 1 from commerciaux where code = p_code and actif) then jsonb_build_object('role', 'commercial', 'nom', (select nom from commerciaux where code = p_code))
    else null end;
$$;
create or replace function public.commercial_ajouter(p_admin text, p_nom text, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admin_codes where code = p_admin) then raise exception 'Code administrateur incorrect' using errcode = 'P0001'; end if;
  insert into commerciaux (code, nom) values (btrim(p_code), btrim(p_nom))
    on conflict (code) do update set nom = excluded.nom, actif = true;
  return true;
end $$;
create or replace function public.commercial_desactiver(p_admin text, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admin_codes where code = p_admin) then raise exception 'Code administrateur incorrect' using errcode = 'P0001'; end if;
  update commerciaux set actif = false where code = p_code;
  return found;
end $$;
create or replace function public.commerciaux_liste(p_admin text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from admin_codes where code = p_admin)
    then coalesce((select jsonb_agg(jsonb_build_object('code', c.code, 'nom', c.nom, 'actif', c.actif,
      'campagnes', (select count(*) from campagnes k where k.commercial = c.code)) order by c.nom) from commerciaux c), '[]') end;
$$;

-- prix d'une campagne d'après les tarifs
create or replace function public.regie_prix(p_formule text, p_rayon int, p_exclusif boolean) returns int
language sql stable security definer set search_path = public as $$
  select round(t.prix * (100 + coalesce((select pourcent from regie_options where cle = 'rayon' || p_rayon), 0)
    + case when p_exclusif then coalesce((select pourcent from regie_options where cle = 'exclusif'), 0) else 0 end) / 100.0)::int
  from regie_tarifs t where t.formule = p_formule;
$$;

-- créer ou modifier une campagne (commercial ou administrateur)
create or replace function public.campagne_enregistrer(p_code text, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare r jsonb := regie_role(p_code); v uuid := nullif(p->>'id', '')::uuid; t regie_tarifs; deb date; k campagnes;
begin
  if r is null then raise exception 'Code commercial incorrect ou désactivé' using errcode = 'P0001'; end if;
  if p->>'lat' is null or p->>'lon' is null or p->>'gps_acc' is null then
    raise exception 'Localisez le point de vente par GPS, sur place' using errcode = 'P0001';
  end if;
  if (p->>'gps_acc')::real > 60 then raise exception 'Signal GPS trop imprécis (± % m) : 60 m au plus', round((p->>'gps_acc')::numeric) using errcode = 'P0001'; end if;
  select * into t from regie_tarifs where formule = p->>'formule';
  if not found then raise exception 'Formule inconnue' using errcode = 'P0001'; end if;
  -- exclusivité : pas deux campagnes exclusives dont les zones se chevauchent
  if coalesce((p->>'exclusif')::boolean, false) and exists (select 1 from campagnes c where c.exclusif and c.statut in ('active', 'a_valider')
      and c.fin >= current_date and c.id is distinct from v
      and 111320 * sqrt(power(c.lat - (p->>'lat')::float8, 2) + power((c.lon - (p->>'lon')::float8) * cos(radians(c.lat)), 2)) < c.rayon_m + coalesce((p->>'rayon_m')::int, 500)) then
    raise exception 'Une autre campagne a déjà l''exclusivité de cette zone' using errcode = 'P0001';
  end if;
  deb := greatest(current_date, coalesce((p->>'debut')::date, current_date));
  if v is null then
    insert into campagnes (commerce, cat, tel, whatsapp, lat, lon, gps_acc, rayon_m, exclusif, formule, debut, fin, modele, titre, sous_titre, accroche, cta, couleur, image,
      statut, prix, paiement, paye, client_nom, client_tel, commercial)
    values (btrim(p->>'commerce'), coalesce(p->>'cat', 'shop'), nullif(regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g'), ''), coalesce((p->>'whatsapp')::boolean, true),
      (p->>'lat')::float8, (p->>'lon')::float8, (p->>'gps_acc')::real, coalesce((p->>'rayon_m')::int, 500), coalesce((p->>'exclusif')::boolean, false),
      t.formule, deb, deb + t.jours - 1, coalesce(p->>'modele', 'promo'), btrim(p->>'titre'), nullif(btrim(p->>'sous_titre'), ''), nullif(btrim(p->>'accroche'), ''),
      coalesce(p->>'cta', 'appel'), coalesce(p->>'couleur', 'jaune'), nullif(p->>'image', ''),
      case when r->>'role' = 'admin' then 'active' else 'a_valider' end,
      regie_prix(t.formule, coalesce((p->>'rayon_m')::int, 500), coalesce((p->>'exclusif')::boolean, false)),
      nullif(btrim(p->>'paiement'), ''), coalesce((p->>'paye')::boolean, false), nullif(btrim(p->>'client_nom'), ''),
      nullif(regexp_replace(coalesce(p->>'client_tel', ''), '\D', '', 'g'), ''), case when r->>'role' = 'commercial' then p_code end)
    returning id into v;
  else
    select * into k from campagnes where id = v;
    if not found or (r->>'role' = 'commercial' and k.commercial is distinct from p_code) then raise exception 'Campagne introuvable' using errcode = 'P0001'; end if;
    update campagnes set commerce = btrim(p->>'commerce'), cat = coalesce(p->>'cat', cat), tel = nullif(regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g'), ''),
      whatsapp = coalesce((p->>'whatsapp')::boolean, whatsapp), lat = (p->>'lat')::float8, lon = (p->>'lon')::float8, gps_acc = (p->>'gps_acc')::real,
      rayon_m = coalesce((p->>'rayon_m')::int, rayon_m), exclusif = coalesce((p->>'exclusif')::boolean, exclusif),
      modele = coalesce(p->>'modele', modele), titre = btrim(p->>'titre'), sous_titre = nullif(btrim(p->>'sous_titre'), ''), accroche = nullif(btrim(p->>'accroche'), ''),
      cta = coalesce(p->>'cta', cta), couleur = coalesce(p->>'couleur', couleur), image = case when p ? 'image' then nullif(p->>'image', '') else image end,
      paiement = nullif(btrim(p->>'paiement'), ''), paye = coalesce((p->>'paye')::boolean, paye), client_nom = nullif(btrim(p->>'client_nom'), ''),
      client_tel = nullif(regexp_replace(coalesce(p->>'client_tel', ''), '\D', '', 'g'), ''),
      -- une campagne modifiée par un commercial repasse en validation
      statut = case when r->>'role' = 'admin' then statut when statut = 'refusee' then 'a_valider' else case when statut = 'active' then 'a_valider' else statut end end,
      updated_at = now()
    where id = v;
  end if;
  return v;
end $$;

-- administrateur : valider / refuser / mettre en pause / reprendre / prolonger
create or replace function public.campagne_action(p_code text, p_id uuid, p_action text, p_motif text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare r jsonb := regie_role(p_code); k campagnes; t regie_tarifs;
begin
  if r is null then raise exception 'Code incorrect' using errcode = 'P0001'; end if;
  select * into k from campagnes where id = p_id;
  if not found or (r->>'role' = 'commercial' and k.commercial is distinct from p_code) then raise exception 'Campagne introuvable' using errcode = 'P0001'; end if;
  if p_action in ('valider', 'refuser') and r->>'role' <> 'admin' then raise exception 'Réservé à l''administrateur' using errcode = 'P0001'; end if;
  if p_action = 'valider' then update campagnes set statut = 'active', motif_refus = null, updated_at = now() where id = p_id;
  elsif p_action = 'refuser' then update campagnes set statut = 'refusee', motif_refus = left(p_motif, 120), updated_at = now() where id = p_id;
  elsif p_action = 'pause' then update campagnes set statut = 'pause', updated_at = now() where id = p_id and statut = 'active';
  elsif p_action = 'reprendre' then
    update campagnes set statut = case when r->>'role' = 'admin' then 'active' else 'a_valider' end, updated_at = now() where id = p_id and statut = 'pause';
  elsif p_action = 'paye' then update campagnes set paye = true, paiement = coalesce(nullif(btrim(p_motif), ''), paiement), updated_at = now() where id = p_id;
  elsif p_action = 'prolonger' then
    select * into t from regie_tarifs where formule = k.formule;
    update campagnes set fin = greatest(fin, current_date) + t.jours, paye = false, paiement = null, updated_at = now() where id = p_id;
  else raise exception 'Action inconnue' using errcode = 'P0001'; end if;
  return true;
end $$;

-- liste des campagnes (les siennes pour un commercial, toutes pour l'administrateur) avec leurs totaux
create or replace function public.campagnes_liste(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  with r as (select regie_role(p_code) j)
  select case when (select j from r) is null then null else coalesce((
    select jsonb_agg(to_jsonb(c) - 'image' || jsonb_build_object('a_image', c.image is not null,
      'commercial_nom', (select nom from commerciaux m where m.code = c.commercial),
      'stats', (select jsonb_build_object('vues', coalesce(sum(s.vues), 0), 'touchers', coalesce(sum(s.touchers), 0), 'appels', coalesce(sum(s.appels), 0),
         'itineraires', coalesce(sum(s.itineraires), 0), 'visites', coalesce(sum(s.visites), 0), 'jours', count(*)) from campagne_stats s where s.campagne_id = c.id))
      order by c.created_at desc)
    from campagnes c where (select j->>'role' from r) = 'admin' or c.commercial = p_code), '[]') end;
$$;
create or replace function public.campagne_image(p_code text, p_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select image from campagnes c where c.id = p_id and regie_role(p_code) is not null
    and (regie_role(p_code)->>'role' = 'admin' or c.commercial = p_code);
$$;
create or replace function public.campagne_stats_jours(p_code text, p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(s) - 'campagne_id' order by s.jour), '[]') from campagne_stats s join campagnes c on c.id = s.campagne_id
  where s.campagne_id = p_id and regie_role(p_code) is not null and (regie_role(p_code)->>'role' = 'admin' or c.commercial = p_code);
$$;

-- l'application envoie ses compteurs du jour, additionnés (aucune position, aucun identifiant)
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
  foreach f in array array['regie_role(text)', 'commercial_ajouter(text, text, text)', 'commercial_desactiver(text, text)', 'commerciaux_liste(text)',
    'regie_prix(text, int, boolean)', 'campagne_enregistrer(text, jsonb)', 'campagne_action(text, uuid, text, text)', 'campagnes_liste(text)',
    'campagne_image(text, uuid)', 'campagne_stats_jours(text, uuid)', 'pub_compter(jsonb)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
