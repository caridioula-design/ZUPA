-- ZUPA — correctif Régie : « violates check constraint campagnes_titre_check »
-- À exécuter une fois dans Supabase › SQL Editor.
-- contrôles de texte tolérants (une ancienne version exigeait un titre de 2 caractères minimum)
alter table public.campagnes drop constraint if exists campagnes_titre_check;
alter table public.campagnes add constraint campagnes_titre_check check (titre is null or char_length(titre) <= 40);
alter table public.campagnes drop constraint if exists campagnes_sous_titre_check;
alter table public.campagnes add constraint campagnes_sous_titre_check check (sous_titre is null or char_length(sous_titre) <= 60);
alter table public.campagnes drop constraint if exists campagnes_accroche_check;
alter table public.campagnes add constraint campagnes_accroche_check check (accroche is null or char_length(accroche) <= 14);
notify pgrst, 'reload schema';
