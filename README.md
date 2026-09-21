# three-freecam

[![npm](https://img.shields.io/npm/v/three-freecam?color=cb3837&logo=npm)](https://www.npmjs.com/package/three-freecam)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)](./package.json)

Unity scene-view camera controls for [three.js](https://threejs.org). Right-drag to look, WASD to
fly, middle-drag to pan, alt-drag to orbit, wheel to dolly.

No dependencies, no UI, no assumptions about your render loop. 1.8 kB gzipped.

```bash
npm i three-freecam
```

## Demo

https://github.com/user-attachments/assets/e120145d-ba64-429e-a774-79b15367efc2

Run it yourself: clone the repo, `npm install && npm run build`, serve the repo root and open
`examples/`. That file is a complete scene in 60 lines.

## Usage

```js
new FreeCam(camera, domElement, options?)
```

| Argument | What to pass |
| --- | --- |
| `camera` | The camera you render with. `FreeCam` drives its `position` and `quaternion`; nothing else touches it. |
| `domElement` | The element that receives mouse input — `renderer.domElement`, the canvas three.js renders into. Keyboard is listened for on `window`, so the canvas does not need focus. |
| `options` | Optional, see [Options](#options). |

Then call `update(dt)` once per frame, where `dt` is how many **seconds** the last frame took.

### A complete scene

Nothing here is specific to this library — it is the standard three.js setup, shown in full so it
is clear where `camera`, `renderer` and `dt` come from.

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

If your loop already tracks a delta, pass that. If it gives you **milliseconds**, divide by 1000.
If it gives you nothing, keep a `THREE.Clock` as above.

Using React Three Fiber:

```jsx
function Controls() {
  const { camera, gl } = useThree();
  const fly = useMemo(() => new FreeCam(camera, gl.domElement), [camera, gl]);
  useEffect(() => () => fly.dispose(), [fly]);
  useFrame((_, delta) => fly.update(delta));
  return null;
}
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

**The pivot** is the point orbit turns around and the wheel dollies toward. By default it sits a
short way in front of the camera and follows it, so both work without you configuring anything.
`focus()` moves it somewhere specific.

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
| `maxPitch`       | `~89°`                |                                                                                                                                     |
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
fly.pivot                           // Vector3 — what orbit and dolly work against
fly.dispose()                       // remove every listener
```

```js
fly.focus(scene.getObjectByName("car")); // frames the whole car
fly.placeAt(new THREE.Vector3(0, 30, 0), new THREE.Vector3(0, 0, 0)); // look down from above
```

`focus()` with an `Object3D` measures its bounding sphere and backs off far enough for the whole
thing to fit the vertical field of view. With a `Vector3` it just aims at that point.

Call `dispose()` when the view goes away — the listeners are on `window`, so they outlive the
canvas otherwise.

## Notes

Movement stops dead with the keys by default, same as the editor. `damping` above 0 smooths it with
framerate-independent exponential decay, so the same value feels the same at 30 and 144 fps.

Works with `WebGLRenderer` and `WebGPURenderer` - it only ever touches `camera.position` and
`camera.quaternion`.

`three` is a peer dependency; any version from 0.150 works.

## Credits

Built by **hxtnv** - [github.com/hxtnv](https://github.com/hxtnv) · [x.com/hxtnv44](https://x.com/hxtnv44)

## License

MIT © [hxtnv](https://github.com/hxtnv)
