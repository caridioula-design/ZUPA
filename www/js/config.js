/* ZUPA — configuration */
window.ZUPA_CONFIG = {
  version: '1.0.0',
  // Liste des pharmacies de garde mise à jour chaque semaine, lue au démarrage (si internet).
  // Doit être une adresse publique : dépôt GitHub public, GitHub Pages, ou tout hébergement de fichiers.
  // La copie intégrée à l'application (data/gardes.json) sert si cette adresse est inaccessible.
  gardesUrl: 'https://raw.githubusercontent.com/caridioula-design/zupa/main/www/data/gardes.json',
  // Serveurs OpenStreetMap utilisés pour actualiser les pharmacies autour de l'utilisateur
  overpass: [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ]
};
