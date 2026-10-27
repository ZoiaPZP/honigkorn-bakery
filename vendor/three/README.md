# three.js r169 (vendored)

- Source: npm package `three@0.169.0` (registry.npmjs.org, sha512 integrity verified), MIT license – see `LICENSE`.
- `three.module.min.js` – `build/three.module.min.js`, unchanged.
- `OrbitControls.js` – `examples/jsm/controls/OrbitControls.js` and `RoomEnvironment.js` –
  `examples/jsm/environments/RoomEnvironment.js` (soft studio env-map for reflections). The only change
  in both is the import `from 'three'` → `from './three.module.min.js'`, so they work without an
  import map or bundler.

Loaded on demand by `js/cake-3d.js` (dynamic `import()`), only when WebGL is available,
"reduce motion" is off and the cake builder comes near the viewport.
