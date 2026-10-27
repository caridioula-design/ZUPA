# Base partagée des lieux (Paiya)

Les toilettes, restaurants, hôtels et commerces ajoutés par les utilisateurs sont enregistrés dans une base en ligne **Supabase** (offre gratuite). Tant qu'elle n'est pas configurée, l'application garde les lieux sur le téléphone et les enverra automatiquement dès qu'elle le sera.

## Mise en place (une seule fois, environ 5 minutes)

1. Créez un compte sur https://supabase.com, puis **New project**. Choisissez par exemple le nom `zupa` et la région la plus proche (Europe de l'Ouest).
2. Dans le projet, ouvrez **SQL Editor › New query**. Collez tout le contenu de `supabase/lieux.sql`, puis cliquez sur **Run**. Faites de même avec `supabase/amis.sql` (amis, partage de lieux, lieux les plus visités).
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

## Amis, partage et lieux les plus visités (`amis.sql`)

- Aucune de ces tables n'est lisible directement : tout passe par des fonctions qui vérifient le secret du téléphone. Seule l'empreinte SHA-256 de ce secret est stockée.
- On ne trouve un utilisateur que par son **code ami** : il n'y a ni annuaire ni recherche par nom. Les amis ne voient que le pseudo.
- Les lieux ne s'échangent qu'entre amis acceptés : 20 demandes d'ami et 60 partages par jour au maximum. Les lieux reçus sont effacés après 90 jours, ou quand l'amitié est retirée.
- **Visites** : l'identifiant change chaque jour (empreinte appareil + date) et n'est relié à aucun profil. Rien n'est compté près des lieux confidentiels de l'utilisateur. Un lieu n'apparaît qu'à partir de 3 visites sur 30 jours, et les visites de plus de 60 jours sont supprimées.
- **Lieux confidentiels** (domicile, travail…) : ils ne quittent jamais le téléphone et ne passent par aucune de ces fonctions.
- **« Effacer mes données en ligne »** (Profil) supprime le profil, les amitiés, les lieux échangés et les lieux publics ajoutés depuis ce téléphone.

## Publications sponsorisées (`pubs.sql`)

L'écran Trajet affiche un espace « À l'arrivée ». Il montre :
1. les **publications sponsorisées** des commerces proches de la destination du voyageur ;
2. la destination elle-même, si c'est un lieu ;
3. les lieux les plus visités ou les plus proches de l'arrivée.

Pour publier une annonce pour un commerçant qui paie : **Table Editor › publications › Insert row**.
- `nom` : le nom du commerce.
- `cat` : resto, shop, hotel, pharma ou autre.
- `lat` et `lon` : la position du commerce (clic droit sur Google Maps › copier les coordonnées).
- `titre` : 60 caractères au maximum, par exemple « Happy hour jusqu'à 21 h ».
- `texte` : 160 caractères au maximum, facultatif.
- `tel` : facultatif.
- `rayon_m` : l'annonce est montrée aux voyageurs dont la destination est à moins de cette distance (600 m par défaut).
- `debut` et `fin` : les dates de diffusion.
- `priorite` : plus le nombre est grand, plus l'annonce passe en premier.
- `actif` : décochez pour suspendre l'annonce.

Le public peut seulement lire les annonces actives et en cours. Personne ne peut en ajouter ni en modifier depuis l'application. Chaque annonce porte la mention « Sponsorisé ».

Pour afficher l'encart « Votre commerce ici ? », renseignez `adsContact` dans `www/js/config.js`, par exemple un lien WhatsApp `https://wa.me/225XXXXXXXXXX`.

## Mise à jour 2 (`v2.sql`)

Ce script ajoute trois choses :
- **Nouvelles catégories de lieux** : maquis et bars, stations, supermarchés, marchés, lieux de culte, pharmacies et cliniques. Les lieux de santé et de culte ne sont jamais comptés dans les visites (données sensibles).
- **Lignes ajoutées par les utilisateurs** (gbaka, wôrô-wôrô, saloni) : gare de départ, arrêts et terminus. Elles sont lisibles par tous, avec 5 ajouts par jour et par appareil. Une ligne est masquée après 3 signalements et ne peut être supprimée que par son auteur.
- **Pharmacies de garde ajoutées par l'administrateur** depuis l'application (Pharmacies › + Ajouter › Une pharmacie de garde).

Créez votre code administrateur une seule fois. Choisissez au moins 8 caractères et gardez-le secret :

```sql
insert into public.admin_codes (code) values ('VOTRE-CODE-SECRET');
```

Pour changer de code, supprimez l'ancien dans **Table Editor › admin_codes**, puis insérez-en un nouveau.

## Imo : logements à louer (`imo.sql`)

Exécutez ce script une fois dans **SQL Editor**, après `amis.sql`. Vous pouvez le relancer sans risque.

Il crée les annonces de logements publiées par les propriétaires et les agents.

**La localisation GPS est obligatoire.** Le serveur refuse toute annonce qui ne respecte pas ces règles :
- les coordonnées GPS sont présentes (un nom de quartier ou une adresse seule ne suffit jamais) ;
- la mesure GPS est précise à ± 50 m au plus ;
- elle a été prise moins de 2 heures avant la publication ;
- le repère publié est à 80 m au plus de cette mesure (60 m dans l'application) ;
- le logement est en Côte d'Ivoire.

**Garde-fous :**
- 5 annonces par jour et 15 annonces actives au plus par téléphone.
- Une annonce en double est refusée.
- Une annonce expire après 45 jours, sauf si son auteur la prolonge.
- Une annonce est masquée après 3 signalements de personnes différentes (mal localisée, fictive, déjà louée, arnaque).

**Confidentialité :** l'auteur n'est identifié que par l'empreinte de son secret. Cette empreinte et la mesure GPS brute ne sont pas lisibles. Seuls le repère publié et sa précision le sont.

Les photos (6 au plus, réduites sur le téléphone) sont enregistrées dans la table `annonce_photos`.

### Clé numérique (incluse dans `imo.sql`)

Si vous aviez déjà exécuté `imo.sql`, relancez-le : il ajoute les clés numériques sans toucher aux annonces.

- **Remise** : l'agent ou le propriétaire, au logement, obtient un code de 6 caractères (valable 20 min, à usage unique). Le locataire, au logement lui aussi, le saisit, vérifie le loyer, l'avance et la caution, puis accepte. L'annonce disparaît et le logement ne peut plus être republié tant que la clé est active. Une seule clé par logement.
- **Restitution** : le locataire, au logement, obtient un code ; l'agent le saisit après avoir récupéré les clés. Le logement est libéré et l'agent peut le remettre en location.
- **Perte du téléphone** : le locataire retrouve ses clés sur un nouveau téléphone avec son code de secours (noté sur papier lors de la remise). Code perdu aussi : l'agent réémet la clé au logement, au même numéro de téléphone. L'ancien téléphone est désactivé.
- **Locataire injoignable** : l'agent demande la reprise ; elle n'est possible qu'après la fin du bail et 30 jours sans contestation du locataire.
- **Preuves** : chaque étape est inscrite dans un journal ineffaçable (date, auteur, position arrondie). Les présences au logement sont vérifiées par GPS (± 100 m, à 150 m au plus de la position vérifiée de l'annonce).
- **Garde-fous** : 8 codes erronés par heure et par téléphone au plus ; les tables des clés ne sont lisibles que par les fonctions du serveur, et chacun ne voit que ses propres clés.

## Publicité des commerçants — démo (`regie.sql`)

Exécutez-le une fois dans **SQL Editor**. Vous pouvez le relancer sans risque : il remplace aussi la première version avec commerciaux et administrateur.

**Créer une publicité :** chaque utilisateur passe par Profil › **Faire la publicité de mon commerce**.
1. Il localise son point de vente par GPS, sur place.
2. Il crée le visuel : modèle rapide, éditeur (textes, images PNG, déplacement, rotation, taille) ou visuel prêt au gabarit 1000 × 800 px.
3. Il choisit le rayon et la durée, puis publie.

**Démo :** la diffusion est immédiate et gratuite.

**Vérifier les publicités avant diffusion (plus tard) :**

```sql
update public.regie_config set valeur = 'oui' where cle = 'validation';   -- les nouvelles campagnes passent « en vérification »
update public.campagnes set statut = 'active' where id = '…';            -- autoriser une campagne
update public.campagnes set statut = 'refusee' where id = '…';           -- la refuser
```

**Règles de diffusion (sur le téléphone) :**
- Dans le rayon d'un point de vente, seules ses pubs s'affichent ; une campagne exclusive passe avant les autres.
- Ailleurs, les campagnes « toute la ville » et celles à moins de 3 km s'affichent, 3 vues par jour au plus par campagne.

**Statistiques :** totaux anonymes par jour. Aucune position ni aucun identifiant n'est envoyé.

**Tarifs prévus** (affichés à titre indicatif pendant la démo) : tables `regie_tarifs` et `regie_options`.
