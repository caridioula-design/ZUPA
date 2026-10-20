-- =====================================================================
-- ZUPA — publications sponsorisées (espace publicitaire de l'écran Trajet)
-- À exécuter dans Supabase : SQL Editor › New query › coller › Run. Ré-exécutable.
--
-- Les publications sont saisies par vous dans Table Editor › publications (une ligne par
-- commerçant qui paie). L'application les lit seulement : actives, dans leurs dates,
-- et proches de la destination du voyageur. Elles sont toujours marquées « Sponsorisé ».
-- =====================================================================

create table if not exists public.publications (
  id         uuid primary key default gen_random_uuid(),
  place_id   text check (char_length(place_id) <= 64),        -- identifiant ZUPA du lieu, s'il existe (ex. n3784306928)
  nom        text not null check (char_length(btrim(nom)) between 2 and 80),   -- nom du commerce
  cat        text not null default 'shop' check (cat in ('hotel', 'resto', 'wc', 'shop', 'pharma', 'autre')),
  lat        double precision not null check (lat between 4.0 and 11.0),
  lon        double precision not null check (lon between -9.0 and -2.0),
  titre      text not null check (char_length(btrim(titre)) between 2 and 60),  -- ex. « Happy hour jusqu'à 21 h »
  texte      text check (char_length(texte) <= 160),                             -- ex. « -20 % sur les grillades ce soir »
  tel        text check (char_length(tel) <= 30),
  rayon_m    int not null default 600 check (rayon_m between 100 and 5000),    -- montrée aux voyageurs qui arrivent à moins de… mètres
  debut      date not null default current_date,
  fin        date not null default current_date + 30,
  actif      boolean not null default true,
  priorite   int not null default 0,                                          -- plus grand = montré en premier
  created_at timestamptz not null default now(),
  check (fin >= debut)
);
create index if not exists publications_actif_idx on public.publications (actif, fin);

alter table public.publications enable row level security;
revoke all on public.publications from anon, authenticated;
grant select (id, place_id, nom, cat, lat, lon, titre, texte, tel, rayon_m, priorite) on public.publications to anon, authenticated;
drop policy if exists publications_lecture on public.publications;
create policy publications_lecture on public.publications for select to anon, authenticated
  using (actif and current_date between debut and fin);
