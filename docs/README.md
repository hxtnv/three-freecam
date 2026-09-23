# docs

The website for three-freecam, published with GitHub Pages straight from this folder at
[hxtnv.github.io/three-freecam](https://hxtnv.github.io/three-freecam/).

| File | What it is |
| --- | --- |
| `index.html` | The live demo. A block city you fly through, with a panel that changes `moveSpeed`, `damping`, `lookSpeed`, `invertY` and `pointerLock` at runtime. |
| `how-to-add-a-debug-camera-to-threejs.html` | The guide: install, construct, `update(delta)`, how it differs from `OrbitControls`, `FlyControls` and `PointerLockControls`, examples for vanilla three.js, React Three Fiber, `WebGLRenderer` and `WebGPURenderer`, and the limitations. |
| `style.css` | Shared styling for both pages. |
| `sitemap.xml` | Submitted to Google Search Console by hand. |
| `.nojekyll` | Stops GitHub Pages running the files through Jekyll. |

No build step and nothing to install. Both pages are plain HTML, and `three` and
`three-freecam` load from unpkg through an import map, pinned by version.

## Running it locally

Any static server, because ES modules do not load over `file://`.

```bash
npx serve docs
```

Then open the address it prints.

## Testing the site against a local build of the library

The published pages load `three-freecam` from unpkg, so they show the last release rather
than your working tree. To point them at your own build, run `npm run build` in the repo
root, serve the repo root rather than `docs/`, and change the import map in
`docs/index.html`:

```json
{
  "imports": {
    "three": "https://unpkg.com/three@0.186.0/build/three.module.js",
    "three-freecam": "../dist/index.js"
  }
}
```

Do not commit that change. `dist/` is gitignored, so the deployed page would break.

## Deploying

GitHub Pages serves this folder directly. Enable it once under
**Settings -> Pages -> Build and deployment -> Source: Deploy from a branch -> Branch:
`main`, folder: `/docs`**. Every push to `main` republishes it. There is no workflow and no
build, so a change here is live about a minute after the push.

## After a release

Both pages pin `three-freecam` by version in their import maps, so a release can never
break the demo on its own. Bump the version in two places after publishing:

- the import map in `docs/index.html`
- the CDN snippet inside `docs/how-to-add-a-debug-camera-to-threejs.html`
