# Base partagée des lieux (Paiya)

Les toilettes, restaurants, hôtels et commerces ajoutés par les utilisateurs sont enregistrés dans une base en ligne **Supabase** (offre gratuite). Tant qu'elle n'est pas configurée, l'application garde les lieux sur le téléphone et les enverra automatiquement dès qu'elle le sera.

## Mise en place (une seule fois, environ 5 minutes)

1. Créez un compte sur https://supabase.com, puis **New project**. Choisissez par exemple le nom `zupa` et la région la plus proche (Europe de l'Ouest).
2. Dans le projet, ouvrez **SQL Editor › New query**. Collez tout le contenu de `supabase/lieux.sql`, puis cliquez sur **Run**.
3. Ouvrez **Project Settings › API** (ou **Connect**) et copiez deux valeurs :
   - **Project URL**, par exemple `https://abcdefgh.supabase.co` ;
   - la clé publique **Publishable key** (`sb_publishable_…`) ou, sur les anciens projets, la clé **anon public**.
   N'utilisez **jamais** la clé `service_role` ou `secret` : elle donne tous les droits.
4. Dans GitHub : **Settings › Secrets and variables › Actions › New repository secret**, créez :
   - `ZUPA_SUPABASE_URL` avec l'URL du projet ;
   - `ZUPA_SUPABASE_KEY` avec la clé publique.
5. Relancez la compilation (**Actions › APK Android › Run workflow**). La note « Base partagée des lieux : configurée » apparaît dans le résumé.

La clé publique peut se trouver dans l'application sans risque : la base n'autorise que la lecture et l'ajout, avec les règles ci-dessous.

## Ce que la base autorise

- **Lecture** : tout le monde, sauf l'identifiant anonyme de l'appareil, qui n'est jamais lisible.
- **Ajout** : tout le monde, au maximum 10 lieux par heure et par appareil, et uniquement en Côte d'Ivoire.
- **Modification** : personne.
- **Suppression** : seulement l'auteur, depuis le téléphone qui a ajouté le lieu.
- **Signalement** : une fois par appareil. Un lieu signalé 3 fois est masqué automatiquement.

## Modérer

Dans Supabase, **Table Editor › lieux** :
- les colonnes `reports` (signalements) et `created_at` permettent de repérer les lieux douteux ;
- pour réafficher un lieu masqué à tort, remettez `reports` à 0 ;
- pour supprimer un lieu, utilisez la suppression de ligne.

La table `signalements` contient le motif de chaque signalement.
