# scenefly

Unity scene-view camera controls for [three.js](https://threejs.org). Right-drag to look, WASD to
fly, middle-drag to pan, alt-drag to orbit, wheel to dolly.

No dependencies, no UI, no assumptions about your render loop. About 8 kB unminified.

```bash
npm i scenefly
```

## Usage

```js
import { SceneFly } from "scenefly";

const fly = new SceneFly(camera, renderer.domElement);

renderer.setAnimationLoop(() => {
  fly.update(clock.getDelta());
  renderer.render(scene, camera);
});
```

That's the whole integration. `update(dt)` takes the frame delta in **seconds**.

## Controls

| Input | Action |
| --- | --- |
| Right-drag | Look around |
| `W` `A` `S` `D` / arrows | Fly, while looking or not |
| `Q` / `E` | Down / up |
| `Shift` | Boost |
| Wheel, while right-dragging | Change fly speed |
| Middle-drag | Pan |
| Wheel | Dolly toward the pivot |
| `Alt` + left-drag | Orbit the pivot |
| `F` | Frame the pivot |

The pivot sits in front of the camera and follows it, so orbit and dolly work without you setting
a target. Call `focus()` to move it somewhere specific.

## Options

```js
const fly = new SceneFly(camera, renderer.domElement, {
  moveSpeed: 12,
  boost: 4,
  lookSpeed: 0.0022,
  panSpeed: 0.0015,
  zoomSpeed: 0.12,
  damping: 0.82,
  invertY: false,
  pointerLock: true,
  keys: { up: ["KeyE"], down: ["KeyQ"] },
});
```

| Option | Default | |
| --- | --- | --- |
| `moveSpeed` | `12` | World units per second. The wheel adjusts this live. |
| `boost` | `4` | Multiplier while Shift is held. |
| `lookSpeed` | `0.0022` | Radians per pixel. |
| `panSpeed` | `0.0015` | World units per pixel, scaled by pivot distance. |
| `zoomSpeed` | `0.12` | Fraction of the pivot distance per wheel notch. |
| `speedStep` | `1.15` | Fly-speed multiplier per notch while looking. |
| `moveSpeedRange` | `[0.1, 500]` | Clamp on `moveSpeed`. |
| `damping` | `0.82` | `0` is instant, higher drifts. This is the one to raise for camera moves you intend to record. |
| `invertY` | `false` | |
| `maxPitch` | `~89°` | |
| `pointerLock` | `true` | Locks the cursor while dragging, so the look never runs out of screen. |
| `keys` | WASD + QE + Shift + F | Partial override, by [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values). |

Every option is also a live property: `fly.moveSpeed = 40` works.

## API

```ts
fly.update(dt)                      // once per frame, dt in seconds
fly.focus(objectOrVector3, dist?)   // frame something; fits the bounding sphere
fly.placeAt(position, lookAt?)      // teleport the camera
fly.enabled = false                 // stop reading input, keep the listeners
fly.pivot                           // Vector3, what orbit and dolly work against
fly.dispose()                       // remove every listener
```

`focus()` with an `Object3D` measures its bounding sphere and backs off far enough for the whole
thing to fit the vertical FOV. With a `Vector3` it just aims at the point.

## Notes

Movement is smoothed with framerate-independent exponential damping, so the same `damping` feels
the same at 30 and 144 fps. Set `damping: 0` if you want the camera to stop dead with the keys.

Works with `WebGLRenderer` and `WebGPURenderer` — it only ever touches `camera.position` and
`camera.quaternion`.

`three` is a peer dependency; any version from 0.150 works.

## License

MIT
