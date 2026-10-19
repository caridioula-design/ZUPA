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

Chaque modification de la branche `main` lance la compilation sur GitHub :

1. Onglet **Actions** › dernière exécution de « APK Android » › section **Artifacts** › `ZUPA-apk`.
2. Décompressez le fichier et installez `ZUPA-1.0.0-buildN.apk` sur le téléphone (autoriser l'installation d'applications de sources inconnues).

Pour publier une version : créez un tag `v1.0.0` (onglet Releases › « Draft a new release »). L'APK est alors joint à la release.

Chaque lundi, la compilation se relance automatiquement avec la liste à jour des pharmacies d'Abidjan.

## Mettre à jour les pharmacies de garde (chaque semaine)

1. Ouvrez `tools/gardes.html` dans un navigateur (sur ordinateur, depuis une copie du dépôt).
2. Indiquez la période, collez la liste officielle (une pharmacie par ligne), cliquez sur « Analyser » puis « Télécharger gardes.json ».
3. Sur GitHub, remplacez `www/data/gardes.json` par ce fichier.

L'application lit ce fichier au démarrage depuis l'adresse `gardesUrl` de `www/js/config.js`. **Cette adresse doit être publique** : si le dépôt reste privé, hébergez `gardes.json` ailleurs (dépôt public dédié, GitHub Pages…) et modifiez `gardesUrl`. Dans tous les cas, la liste est intégrée au prochain APK.

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
