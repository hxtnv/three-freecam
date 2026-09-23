# three-freecam

**A debug camera for [three.js](https://threejs.org).** Editor-style scene-view controls,
the way Unity, Unreal and Godot do it: right-drag to look, WASD to fly, middle-drag to pan,
alt-drag to orbit, wheel to dolly, F to frame.

[![npm version](https://img.shields.io/npm/v/three-freecam?color=cb3837&logo=npm&label=npm)](https://www.npmjs.com/package/three-freecam)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](./package.json)
[![ci](https://img.shields.io/github/actions/workflow/status/hxtnv/three-freecam/ci.yml?branch=main&label=ci&logo=github)](https://github.com/hxtnv/three-freecam/actions/workflows/ci.yml)
[![downloads](https://img.shields.io/npm/dm/three-freecam?color=orange&label=downloads)](https://www.npmjs.com/package/three-freecam)
[![license](https://img.shields.io/npm/l/three-freecam?color=blue)](./LICENSE)

**[Try the live demo](https://hxtnv.github.io/three-freecam-demo/)** ·
**[Install from npm](https://www.npmjs.com/package/three-freecam)** ·
**[Read the guide](https://hxtnv.github.io/three-freecam-demo/how-to-add-a-debug-camera-to-threejs.html)** ·
**[View source](https://github.com/hxtnv/three-freecam)**

```bash
npm i three-freecam
```

1.81 kB minified and gzipped. No dependencies, no UI, no assumptions about your render loop.
Works with `WebGLRenderer`, `WebGPURenderer` and React Three Fiber. TypeScript types included.

---

## What it is for

You are building a three.js scene and you need to get inside it: check whether a mesh is
really floating, look behind a wall, find the object that is somehow at `(0, -4000, 0)`,
or record a flythrough. `OrbitControls` will not let you do that, because it always points
at a pivot. This is the camera a game engine gives you for exactly that job.

Common names for the same thing: debug camera, free camera, freecam, noclip camera,
spectator camera, editor camera, scene-view camera, flycam, fly camera, viewport camera,
WASD camera.

## Demo

https://github.com/user-attachments/assets/e120145d-ba64-429e-a774-79b15367efc2

**[Fly around it in your browser](https://hxtnv.github.io/three-freecam-demo/)**, no install.

To run the example in this repo: clone it, `npm install && npm run build`, serve the repo
root and open `examples/`. That file is a complete scene in 60 lines.

## Quick start

Three steps. Install it, construct it, call `update(delta)` once per frame.

```js
import * as THREE from "three";
import { FreeCam } from "three-freecam";

const camera = new THREE.PerspectiveCamera(
  60,
  innerWidth / innerHeight,
  0.1,
  1000,
);
const renderer = new THREE.WebGLRenderer();

const fly = new FreeCam(camera, renderer.domElement);
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  fly.update(clock.getDelta()); // delta in seconds
  renderer.render(scene, camera);
});
```

That is the whole integration. Right-drag the canvas and fly.

## Usage

```js
new FreeCam(camera, domElement, options?)
```

| Argument     | What to pass                                                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `camera`     | The camera you render with. `FreeCam` drives its `position` and `quaternion`; nothing else touches it.                                                                            |
| `domElement` | The element that receives mouse input, normally `renderer.domElement`, the canvas three.js renders into. Keyboard is listened for on `window`, so the canvas does not need focus. |
| `options`    | Optional, see [Options](#options).                                                                                                                                                |

Then call `update(dt)` once per frame, where `dt` is how many **seconds** the last frame took.

### A complete scene

Nothing here is specific to this library. It is the standard three.js setup, shown in full so
it is clear where `camera`, `renderer` and `dt` come from.

```js
import * as THREE from "three";
import { FreeCam } from "three-freecam";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(5, 5, 10);

scene.add(new THREE.GridHelper(50, 50));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

const fly = new FreeCam(camera, renderer.domElement);

// THREE.Clock measures the time between frames. getDelta() returns it in seconds
// and resets, so call it exactly once per frame.
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  fly.update(clock.getDelta());
  renderer.render(scene, camera);
});
```

### Adding it to an app you already have

Two lines, wherever your render loop lives:

```js
const fly = new FreeCam(camera, renderer.domElement);
// ...inside the loop, before render():
fly.update(deltaSeconds);
```

If your loop already tracks a delta, pass that. If it gives you **milliseconds**, divide by 1000. If it gives you nothing, keep a `THREE.Clock` as above.

### React Three Fiber

```jsx
import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { FreeCam } from "three-freecam";

function DebugCamera() {
  const { camera, gl } = useThree();
  const fly = useMemo(() => new FreeCam(camera, gl.domElement), [camera, gl]);
  useEffect(() => () => fly.dispose(), [fly]);
  useFrame((_, delta) => fly.update(delta));
  return null;
}
```

Drop `<DebugCamera />` inside your `<Canvas>`. `useFrame` already hands you a delta in
seconds. Gate it on a flag if you only want it in development:

```jsx
{
  import.meta.env.DEV && <DebugCamera />;
}
```

### WebGPURenderer

Identical. `FreeCam` only writes `camera.position` and `camera.quaternion`, so the renderer
behind it makes no difference.

```js
import * as THREE from "three/webgpu";
import { FreeCam } from "three-freecam";

const renderer = new THREE.WebGPURenderer({ antialias: true });
await renderer.init();

const fly = new FreeCam(camera, renderer.domElement);
renderer.setAnimationLoop(() => {
  fly.update(clock.getDelta());
  renderer.render(scene, camera);
});
```

## Controls

| Input                       | Action                    |
| --------------------------- | ------------------------- |
| Right-drag                  | Look around               |
| `W` `A` `S` `D` / arrows    | Fly, while looking or not |
| `Q` / `E`                   | Down / up                 |
| `Shift`                     | Boost                     |
| Wheel, while right-dragging | Change fly speed          |
| Middle-drag                 | Pan                       |
| Wheel                       | Dolly toward the pivot    |
| `Alt` + left-drag           | Orbit the pivot           |
| `F`                         | Frame the pivot           |

**The pivot** is the point orbit turns around and the wheel dollies toward. By default it
sits a short way in front of the camera and follows it, so both work without you configuring
anything. `focus()` moves it somewhere specific.

Left-drag with no modifier is left alone, so your own picking, gizmos and selection keep
working.

## Options

```js
const fly = new FreeCam(camera, renderer.domElement, {
  moveSpeed: 12,
  boost: 4,
  lookSpeed: 0.0022,
  panSpeed: 0.0015,
  zoomSpeed: 0.12,
  damping: 0,
  invertY: false,
  pointerLock: true,
  keys: { up: ["KeyE"], down: ["KeyQ"] },
});
```

| Option           | Default               |                                                                                                                                     |
| ---------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `moveSpeed`      | `12`                  | World units per second. The wheel adjusts this live.                                                                                |
| `boost`          | `4`                   | Multiplier while Shift is held.                                                                                                     |
| `lookSpeed`      | `0.0022`              | Radians per pixel.                                                                                                                  |
| `panSpeed`       | `0.0015`              | World units per pixel, scaled by pivot distance.                                                                                    |
| `zoomSpeed`      | `0.12`                | Fraction of the pivot distance per wheel notch.                                                                                     |
| `speedStep`      | `1.15`                | Fly-speed multiplier per notch while looking.                                                                                       |
| `moveSpeedRange` | `[0.1, 500]`          | Clamp on `moveSpeed`.                                                                                                               |
| `damping`        | `0`                   | Instant, like the editor. Raise it toward 1 for a drifting glide when recording.                                                    |
| `invertY`        | `false`               |                                                                                                                                     |
| `maxPitch`       | `~89 degrees`         |                                                                                                                                     |
| `pointerLock`    | `true`                | Locks the cursor while dragging, so the look never runs out of screen.                                                              |
| `keys`           | WASD + QE + Shift + F | Partial override, by [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values). |

Every option is also a live property, so you can change any of them at runtime:
`fly.moveSpeed = 40`.

## API

```ts
fly.update(dt)                      // once per frame, dt in seconds
fly.focus(objectOrVector3, dist?)   // frame something
fly.placeAt(position, lookAt?)      // jump the camera somewhere
fly.enabled = false                 // ignore input without tearing anything down
fly.pivot                           // Vector3, what orbit and dolly work against
fly.dispose()                       // remove every listener
```

```js
fly.focus(scene.getObjectByName("car")); // frames the whole car
fly.placeAt(new THREE.Vector3(0, 30, 0), new THREE.Vector3(0, 0, 0)); // look down from above
```

`focus()` with an `Object3D` measures its bounding sphere and backs off far enough for the
whole thing to fit the vertical field of view. With a `Vector3` it just aims at that point.

Call `dispose()` when the view goes away. The listeners are on `window`, so they outlive the
canvas otherwise.

## When to use this instead of OrbitControls, FlyControls or PointerLockControls

|                                    | three-freecam                   | OrbitControls               | FlyControls             | PointerLockControls         |
| ---------------------------------- | ------------------------------- | --------------------------- | ----------------------- | --------------------------- |
| Goes anywhere in the scene         | yes                             | no, always circles a target | yes                     | yes                         |
| Can also orbit a target            | yes, alt-drag                   | yes, that is all it does    | no                      | no                          |
| WASD flight                        | yes                             | no                          | yes                     | yes, you write the movement |
| Left mouse stays free for your app | yes                             | no, it is the orbit drag    | yes                     | no, it captures everything  |
| Speed changed on the fly           | yes, wheel while looking        | not applicable              | no, set `movementSpeed` | you write it                |
| Frame an object                    | yes, `focus()` and `F`          | no                          | no                      | no                          |
| Cursor stays usable                | yes, only locked while dragging | yes                         | yes                     | no, locked until Escape     |
| Roll                               | never, horizon stays level      | never                       | yes, it can tip over    | never                       |

**Use `OrbitControls`** when the scene is one object and the user is looking _at_ it: a
product viewer, a model preview, a configurator. Orbiting is the whole interaction and a
fixed target is a feature.

**Use `FlyControls`** for an on-rails or aircraft feel where roll is wanted and the camera
is expected to tip over. It has no pivot, no framing and no pointer capture on demand.

**Use `PointerLockControls`** when you are building a first-person _game_. It takes the
cursor for the entire session, which is right for gameplay and wrong for a tool that also
has buttons, panels and a DOM UI.

**Use `three-freecam`** when you want the camera from an editor viewport: inspect a large
scene, debug placement, fly to a corner, then alt-drag around the thing you found and press
`F` to frame it. It is the only one of the four where look, fly, pan, orbit and framing are
all present and share one pivot, and where left-click is still yours.

You can also keep both. `OrbitControls` for your users, `FreeCam` behind a debug flag:

```js
const fly = new FreeCam(camera, renderer.domElement);
fly.enabled = false;

addEventListener("keydown", (e) => {
  if (e.code !== "Backquote") return;
  fly.enabled = !fly.enabled;
  orbit.enabled = !fly.enabled;
});
```

## Questions

### How do I add a debug camera to three.js?

`npm i three-freecam`, then `new FreeCam(camera, renderer.domElement)` and
`fly.update(delta)` in your render loop. Full walkthrough in the
[guide](https://hxtnv.github.io/three-freecam-demo/how-to-add-a-debug-camera-to-threejs.html).

### Does it work with React Three Fiber?

Yes, see [React Three Fiber](#react-three-fiber) above. `useFrame` gives you the delta
already, and the only thing to remember is `dispose()` on unmount.

### Does it work with WebGPURenderer?

Yes. It writes `camera.position` and `camera.quaternion` and nothing else, so it does not
know or care which renderer draws the frame.

### Does it work on a trackpad or a laptop with no middle button?

Look, fly, orbit and dolly do. Pan needs a middle button, so on a trackpad remap it or use
alt-drag orbit plus `F` instead. There is no touch support, see
[Limitations](#limitations).

### Can I use it with TypeScript?

Yes, the library is written in TypeScript and ships its own declarations. `FreeCamOptions`
and `FreeCamKeys` are exported.

### Which three.js versions are supported?

`three` is a peer dependency, `>=0.150.0`. CI runs the test suite against 0.150, 0.168 and
the latest release on every push.

### How do I change the keys?

Pass `keys`, using [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values)
values. It is a partial override, so anything you leave out keeps its default:

```js
new FreeCam(camera, dom, { keys: { forward: ["KeyZ"], back: ["KeyS"] } });
```

`code` is physical, not layout-dependent, so `KeyW` is the same physical key on AZERTY. If
you want AZERTY users on `ZQSD`, map it yourself.

### How do I turn it off temporarily, for example while a dialog is open?

`fly.enabled = false`. Input is ignored and the camera stops, but nothing is torn down, so
`fly.enabled = true` picks straight back up. Use `dispose()` only when the view itself is
going away.

### Why does my camera not move?

Almost always one of three things. You are not calling `update(dt)` in the loop. You are
passing milliseconds instead of seconds, which makes everything 1000 times too fast rather
than too slow. Or something else is writing `camera.position` after `update` runs, for
example `OrbitControls` still being active or a `lookAt` in your loop.

### Can I use it for a cinematic flythrough?

Yes, that is what `damping` is for. `damping: 0` is the editor feel. Raise it toward 1 for a
weighted glide, which is much nicer to record. The smoothing is framerate independent, so
the same value behaves the same at 30 and 144 fps.

### Does it handle collision, gravity or clipping?

No, and it will not. It is a free camera: it flies through walls on purpose. If you need a
character controller, that is a different library.

### Is it tree-shakeable?

Yes. `sideEffects: false`, ESM only, one exported class.

### How big is it really?

1.81 kB minified and gzipped, with `three` external. A CI job fails the build if it grows
past 2.00 kB, so that number stays true.

## Limitations

Stated plainly, so you can tell in one minute whether this fits.

- **No touch or pointer-gesture support.** It is a mouse and keyboard tool, which is what a
  debug camera normally is. Touch is not on the roadmap.
- **Pan needs a middle mouse button.** There is no built-in trackpad fallback.
- **No collision, gravity or clipping.** It flies through geometry by design.
- **No roll.** Pitch is clamped near 90 degrees and the horizon is always level. If you want
  a camera that can tip over, use `FlyControls`.
- **Perspective cameras only for `focus()`.** The framing maths reads `fov`. The rest works
  with any camera; an `OrthographicCamera` just needs an explicit distance.
- **It writes the camera every frame.** Anything else that moves the same camera after
  `update()` wins, so pick one owner.
- **No transition or easing on `focus()` and `placeAt()`.** They jump. Tween them yourself
  if you want a glide.
- **No saved viewpoints, gizmo or UI.** By design, it is 1.81 kB.

## Notes

Movement stops dead with the keys by default, same as the editor. `damping` above 0 smooths
it with framerate-independent exponential decay, so the same value feels the same at 30 and
144 fps.

`three` is a peer dependency; any version from 0.150 works.

## Contributing

```bash
npm install
npm run check   # typecheck, tests, bundle budget
```

Tests run on `node:test` against a small DOM stub, so there is no browser to install. See
[test/](./test).

## Changelog

[CHANGELOG.md](./CHANGELOG.md).

## Credits

Built by **hxtnv** - [github.com/hxtnv](https://github.com/hxtnv) · [x.com/hxtnv44](https://x.com/hxtnv44)

## License

MIT © [hxtnv](https://github.com/hxtnv)
