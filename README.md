# ZUPA

**Bouge. Trouve. Vis.**

ZUPA simplifie votre quotidien à Abidjan : itinéraires en bus SOTRA (avec correspondances et suivi du trajet) et pharmacies de garde autour de vous. Application Android (APK) construite avec [Capacitor](https://capacitorjs.com) à partir d'une application web.

## Fonctionnalités

**Bus**
- 261 trajets SOTRA et plus de 1 000 arrêts intégrés : l'application fonctionne sans internet (sauf le fond de carte).
- Itinéraires directs, avec une ou deux correspondances, depuis votre position ou un arrêt.
- Suivi du trajet arrêt par arrêt, avec alerte avant de descendre.
- Favoris, recherches récentes, ajout d'arrêts manquants par les utilisateurs (export / import).
- Correction manuelle de la position quand le GPS est imprécis.

**Pharmacies**
- Pharmacies autour de vous (OpenStreetMap), triées par distance.
- Pharmacies de garde de la semaine, pharmacies ouvertes selon leurs horaires.
- Fiche détaillée : carte et trajet à pied, appel direct, itinéraire en bus jusqu'à la pharmacie, partage.

## Récupérer l'APK

Chaque modification de la branche `main` lance la compilation sur GitHub (onglet **Actions**, environ 5 minutes) :

- **Releases › ZUPA 1.0.0** : toujours le dernier APK de la version en cours (`ZUPA-1.0.0.apk`). C'est le lien à utiliser pour installer l'application.
- **Actions** › exécution « APK Android » › **Artifacts** : l'APK de chaque compilation (conservé 30 jours).

Installation : ouvrez le fichier `.apk` sur le téléphone Android et autorisez l'installation depuis cette source.

Nouvelle version : changez `version` dans `package.json` (ex. `1.1.0`) et `versionName` dans `android/app/build.gradle` ; une nouvelle release est créée automatiquement.

Chaque lundi, la compilation se relance avec la liste à jour des pharmacies d'Abidjan.

## Pharmacies de garde (automatique)

Chaque jour à 5 h 30, le traitement GitHub « Pharmacies de garde » (onglet **Actions**) :

1. télécharge le PDF mensuel officiel « Tour de garde » de l'[UNPPCI](https://www.unppci.org/) (toutes les semaines du mois, avec adresse, pharmacien et téléphones) ;
2. lit aussi les PDF déposés dans le dossier `gardes-pdf/` (secours si le site de l'UNPPCI change) ;
3. complète si besoin avec [pharmacies-de-garde.ci](https://www.pharmacies-de-garde.ci/liste-des-pharmacies-de-garde-a-abidjan-votre-permanence/) et [annuaireci.com](https://annuaireci.com/pharmacies-de-garde/abidjan/), et compare les listes ;
4. publie le résultat dans `www/data/gardes.json` (semaine en cours et semaines suivantes).

L'application lit ce fichier à chaque démarrage (adresse `gardesUrl` de `www/js/config.js`) et passe d'elle-même à la semaine suivante le samedi. Le compte rendu de chaque exécution (nombre de pharmacies par source) apparaît dans les annotations du traitement.

**En cas de problème** : déposez le PDF du mois dans `gardes-pdf/` (Add file › Upload files) ; le traitement se relance aussitôt. L'outil manuel `tools/gardes.html` reste disponible pour saisir une liste à la main.

## Mettre à jour les lignes de bus

Ouvrez `tools/maj-lignes-osm.html`, téléchargez les lignes depuis OpenStreetMap, choisissez `www/data/bus.js`, puis remplacez ce fichier dans le dépôt par celui produit.

## Publier sur le Play Store

L'APK de test est signé avec une clé de débogage. Pour une version publiable, créez une clé de signature et ajoutez ces secrets au dépôt (Settings › Secrets and variables › Actions) :

| Secret | Contenu |
|---|---|
| `ZUPA_KEYSTORE_BASE64` | le fichier `.jks` encodé en base64 |
| `ZUPA_KEYSTORE_PASSWORD` | mot de passe du fichier |
| `ZUPA_KEY_ALIAS` | alias de la clé |
| `ZUPA_KEY_PASSWORD` | mot de passe de la clé |

La compilation produit alors aussi `ZUPA-1.0.0-signe.apk` et `ZUPA-1.0.0-playstore.aab`. Conservez la clé précieusement : elle est indispensable pour toutes les mises à jour.

## Développement

```bash
npm install
npm run serve          # application web sur http://localhost:8080
npm run sync           # copie www/ dans le projet Android
npm run apk            # compile l'APK (Android SDK requis)
```

| Dossier | Contenu |
|---|---|
| `www/` | application (HTML, CSS, JS, données) |
| `www/data/` | `bus.js` (lignes), `pharmacies.js` (OpenStreetMap), `gardes.json` (garde de la semaine) |
| `android/` | projet Android Capacitor (identifiant `ci.zupa.app`) |
| `scripts/` | téléchargement des pharmacies lors de la compilation |
| `tools/` | outils d'administration (lignes de bus, liste de garde) |

Données © contributeurs [OpenStreetMap](https://www.openstreetmap.org/copyright), licence ODbL. Fond de carte © Esri.
