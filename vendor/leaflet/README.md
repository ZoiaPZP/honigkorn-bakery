# Leaflet 1.9.4 (vendored)

- Source: npm package `leaflet@1.9.4` (registry.npmjs.org, sha512 integrity verified), BSD-2-Clause license – see `LICENSE`.
- `leaflet.js`, `leaflet.css`, `images/` – from `dist/`. The only change: the trailing
  `//# sourceMappingURL=leaflet.js.map` comment was removed (the map is not shipped).

Loaded on demand by `js/map.js` only after the visitor clicks "Karte laden" (or ticked
"Karte immer laden" earlier). Leaflet itself comes from this server; only the map tiles are then
requested from tile.openstreetmap.org.
