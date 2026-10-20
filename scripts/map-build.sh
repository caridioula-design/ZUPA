#!/usr/bin/env bash
# ZUPA — extrait la carte vectorielle du Grand Abidjan (Protomaps, données OpenStreetMap) dans www/maps/abidjan.pmtiles
set -euo pipefail
OUT=www/maps/abidjan.pmtiles
BBOX="-4.30,5.15,-3.70,5.62"
mkdir -p www/maps /tmp/pmt
if [ -s "$OUT" ]; then echo "Carte déjà présente (cache)"; exit 0; fi
# outil pmtiles (go-pmtiles)
gh release download -R protomaps/go-pmtiles -p '*Linux_x86_64.tar.gz' -D /tmp/pmt --clobber
tar -xzf /tmp/pmt/*Linux_x86_64.tar.gz -C /tmp/pmt
# dernière carte mondiale publiée par Protomaps
KEY=$(curl -sf https://build-metadata.protomaps.dev/builds.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const b=JSON.parse(s).map(x=>x.key||x).filter(k=>/\.pmtiles$/.test(k)).sort();console.log(b[b.length-1]||'')})" || true)
if [ -z "$KEY" ]; then
  for i in $(seq 0 14); do d=$(date -u -d "-$i day" +%Y%m%d); if curl -sfI "https://build.protomaps.com/$d.pmtiles" >/dev/null; then KEY="$d.pmtiles"; break; fi; done
fi
[ -n "$KEY" ] || { echo "::warning title=Carte hors ligne::aucune carte Protomaps trouvée"; exit 0; }
echo "Source : https://build.protomaps.com/$KEY"
/tmp/pmt/pmtiles extract "https://build.protomaps.com/$KEY" "$OUT" --bbox="$BBOX" --maxzoom=15
SIZE=$(stat -c %s "$OUT")
if [ "$SIZE" -gt 70000000 ]; then   # trop lourd pour l'APK : zoom maximal 14 (le zoom au-delà reste net, la carte est vectorielle)
  rm -f "$OUT"; /tmp/pmt/pmtiles extract "https://build.protomaps.com/$KEY" "$OUT" --bbox="$BBOX" --maxzoom=14
fi
echo "$KEY" > www/maps/SOURCE.txt
