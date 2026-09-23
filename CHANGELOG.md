# Changelog

All notable changes to three-freecam are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the version is below 1.0, a minor bump may contain a breaking change. Every one of
them is listed under **Changed** or **Removed** with a migration note.

## [Unreleased]

### Added

- Live demo and a written guide at
  [hxtnv.github.io/three-freecam](https://hxtnv.github.io/three-freecam/).
- A test suite covering flight, look, pan, orbit, dolly, the fly-speed throttle, pointer
  lock, `focus`, `placeAt`, `enabled` and `dispose`. It runs on `node:test` against a
  small DOM stub, so there is no headless browser in the loop.
- Continuous integration on Node 20, 22 and 24, across Linux and Windows, and against
  three 0.150, 0.168 and latest, so the declared peer range is actually tested.
- `npm run size`, a bundle budget that fails the build if the minified and gzipped entry
  point grows past 2.00 kB. It is 1.81 kB today.
- A tag check on release, so a published version can never disagree with `package.json`.

### Changed

- README rewritten around what the library is used for: a debug camera and an
  editor-style scene view for three.js. Added a comparison with `OrbitControls`,
  `FlyControls` and `PointerLockControls`, a frequently asked questions section and an
  honest list of limitations.

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

[Unreleased]: https://github.com/hxtnv/three-freecam/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/hxtnv/three-freecam/releases/tag/v0.1.1
[0.1.0]: https://www.npmjs.com/package/three-freecam/v/0.1.0
