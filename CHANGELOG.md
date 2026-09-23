# Changelog

All notable changes to three-freecam are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the version is below 1.0, a minor bump may contain a breaking change. Every one of
them is listed under **Changed** or **Removed** with a migration note.

## [Unreleased]

Nothing yet.

## [0.2.0] - 2026-09-23

A documentation, testing and infrastructure release. **No runtime behaviour changed**,
so upgrading from 0.1.1 cannot break anything. The compiled output is byte-identical
apart from comments.

### Added

- A live demo and a written guide at
  [hxtnv.github.io/three-freecam](https://hxtnv.github.io/three-freecam/), published
  from `docs/`. The demo changes `moveSpeed`, `damping`, `lookSpeed`, `invertY` and
  `pointerLock` at runtime, so the options are something you can feel rather than read.
- A test suite covering flight, look, pan, orbit, dolly, the fly-speed throttle, pointer
  lock, `focus`, `placeAt`, `enabled` and `dispose`. It runs on `node:test` against a
  small DOM stub, so there is no headless browser and no test-runner dependency.
- Continuous integration on Node 20, 22 and 24, across Linux and Windows, and against
  three 0.150, 0.168 and latest, so the declared peer range is tested rather than
  assumed.
- `npm run size`, a bundle budget that fails the build if the minified and gzipped entry
  point grows past 2.00 kB. It is 1.81 kB today, which is the figure the README quotes.
- `npm run check`, which runs the typecheck, the tests and the budget in one go.
- A tag check on release, so a published version can never disagree with `package.json`.
- This changelog, now shipped inside the npm package.

### Changed

- README rewritten around what the library is for: a debug camera and an editor-style
  scene view for three.js. Adds a comparison with `OrbitControls`, `FlyControls` and
  `PointerLockControls`, a questions section, and an honest list of limitations.
- `description`, `keywords` and `homepage` in `package.json` updated to match. The
  homepage now points at the demo site instead of the README anchor.

## [0.1.1] - 2026-09-21

### Added

- A self-contained usage example in the README, showing where `camera`, `renderer` and
  `dt` come from.

## [0.1.0] - 2026-09-21

### Added

- First release. `FreeCam` with right-drag look, WASD flight, Q and E for vertical,
  Shift boost, middle-drag pan, wheel dolly, alt and left-drag orbit, F to frame the
  pivot, and a scroll-wheel fly-speed throttle while looking.
- `focus`, `placeAt`, `dispose`, `enabled` and a live `pivot`.
- Options for `moveSpeed`, `boost`, `lookSpeed`, `panSpeed`, `zoomSpeed`, `speedStep`,
  `moveSpeedRange`, `damping`, `invertY`, `maxPitch`, `pointerLock` and `keys`.
- TypeScript types, no runtime dependencies, `three` as a peer dependency from 0.150.

[Unreleased]: https://github.com/hxtnv/three-freecam/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/hxtnv/three-freecam/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/hxtnv/three-freecam/releases/tag/v0.1.1
[0.1.0]: https://www.npmjs.com/package/three-freecam/v/0.1.0
