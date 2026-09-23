import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BoxGeometry,
  Euler,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Vector3,
} from "three";

import { FreeCam } from "../dist/index.js";
import { drag, installDom, keyDown, keyUp } from "./dom-stub.js";

const FRAME = 1 / 60;

let env;
let camera;
let fly;

function make(options) {
  camera = new PerspectiveCamera(60, 1, 0.1, 1000);
  camera.updateMatrixWorld();
  fly = new FreeCam(camera, env.dom, options);
  return fly;
}

/** Runs n frames of the given length, the way a render loop would. */
function step(frames = 1, dt = FRAME) {
  for (let i = 0; i < frames; i++) fly.update(dt);
}

/**
 * Yaw and pitch in YXZ order, which is the order FreeCam works in.
 * camera.rotation defaults to XYZ and reports different numbers for the same aim.
 */
function aim() {
  return new Euler().setFromQuaternion(camera.quaternion, "YXZ");
}

beforeEach(() => {
  env = installDom();
});

afterEach(() => {
  fly?.dispose();
  fly = undefined;
  env.teardown();
});

describe("construction", () => {
  it("applies documented defaults", () => {
    make();
    assert.equal(fly.moveSpeed, 12);
    assert.equal(fly.boost, 4);
    assert.equal(fly.lookSpeed, 0.0022);
    assert.equal(fly.panSpeed, 0.0015);
    assert.equal(fly.zoomSpeed, 0.12);
    assert.equal(fly.speedStep, 1.15);
    assert.deepEqual(fly.moveSpeedRange, [0.1, 500]);
    assert.equal(fly.damping, 0);
    assert.equal(fly.invertY, false);
    assert.equal(fly.pointerLock, true);
    assert.equal(fly.enabled, true);
  });

  it("takes option overrides", () => {
    make({ moveSpeed: 40, boost: 2, invertY: true, pointerLock: false });
    assert.equal(fly.moveSpeed, 40);
    assert.equal(fly.boost, 2);
    assert.equal(fly.invertY, true);
    assert.equal(fly.pointerLock, false);
  });

  it("adopts the orientation the camera already had", () => {
    camera = new PerspectiveCamera(60, 1, 0.1, 1000);
    camera.rotation.set(0, Math.PI / 2, 0, "YXZ");
    camera.updateMatrixWorld();
    const before = camera.quaternion.clone();

    fly = new FreeCam(camera, env.dom);
    fly.update(FRAME);

    assert.ok(camera.quaternion.angleTo(before) < 1e-6);
  });

  it("registers its listeners on the canvas, window and document", () => {
    make();
    assert.equal(env.dom.count(), 3);
    assert.equal(env.win.count(), 5);
    assert.equal(env.doc.count(), 1);
  });
});

describe("keyboard flight", () => {
  it("flies forward along -Z for an unrotated camera", () => {
    make({ moveSpeed: 10 });
    keyDown(env.win, "KeyW");
    step(1, 0.5);

    assert.ok(Math.abs(camera.position.x) < 1e-9);
    assert.ok(Math.abs(camera.position.y) < 1e-9);
    assert.ok(Math.abs(camera.position.z - -5) < 1e-9);
  });

  it("moves at moveSpeed world units per second whatever the frame length", () => {
    make({ moveSpeed: 12 });
    keyDown(env.win, "KeyW");
    step(60, FRAME);
    const manyFrames = camera.position.length();

    fly.dispose();
    make({ moveSpeed: 12 });
    keyDown(env.win, "KeyW");
    step(1, 1);

    assert.ok(Math.abs(manyFrames - camera.position.length()) < 1e-9);
  });

  it("cancels opposing keys", () => {
    make();
    keyDown(env.win, "KeyW");
    keyDown(env.win, "KeyS");
    step(10);
    assert.ok(camera.position.length() < 1e-9);
  });

  it("normalizes diagonals so strafing is not faster", () => {
    make({ moveSpeed: 10 });
    keyDown(env.win, "KeyW");
    keyDown(env.win, "KeyD");
    step(1, 1);
    assert.ok(Math.abs(camera.position.length() - 10) < 1e-9);
  });

  it("multiplies speed while the boost key is held", () => {
    make({ moveSpeed: 10, boost: 3 });
    keyDown(env.win, "KeyW");
    keyDown(env.win, "ShiftLeft");
    step(1, 1);
    assert.ok(Math.abs(camera.position.length() - 30) < 1e-9);
  });

  it("stops when the key is released", () => {
    make({ moveSpeed: 10 });
    keyDown(env.win, "KeyW");
    step(1, 1);
    keyUp(env.win, "KeyW");
    const resting = camera.position.clone();
    step(30);
    assert.ok(camera.position.distanceTo(resting) < 1e-9);
  });

  it("keeps Q and E on the world vertical, not the camera vertical", () => {
    make({ moveSpeed: 10 });
    fly.placeAt(new Vector3(0, 0, 0), new Vector3(0, -1, 0));
    keyDown(env.win, "KeyE");
    step(1, 1);
    assert.ok(Math.abs(camera.position.y - 10) < 1e-6);
    assert.ok(Math.abs(camera.position.x) < 1e-6);
    assert.ok(Math.abs(camera.position.z) < 1e-6);
  });

  it("honours a custom keymap and leaves the rest at their defaults", () => {
    make({ moveSpeed: 10, keys: { forward: ["KeyI"] } });
    keyDown(env.win, "KeyW");
    step(1, 1);
    assert.ok(camera.position.length() < 1e-9);

    keyDown(env.win, "KeyI");
    step(1, 1);
    assert.ok(Math.abs(camera.position.z - -10) < 1e-9);
  });

  it("clears held keys when the window loses focus", () => {
    make({ moveSpeed: 10 });
    keyDown(env.win, "KeyW");
    env.win.dispatch("blur");
    step(30);
    assert.ok(camera.position.length() < 1e-9);
  });
});

describe("damping", () => {
  it("eases into the target speed instead of jumping to it", () => {
    make({ moveSpeed: 10, damping: 0.8 });
    keyDown(env.win, "KeyW");
    step(1, FRAME);
    const travelled = camera.position.length();
    assert.ok(travelled > 0);
    assert.ok(travelled < 10 * FRAME);
  });

  it("converges on the same distance at 30 and 144 fps", () => {
    make({ moveSpeed: 10, damping: 0.8 });
    keyDown(env.win, "KeyW");
    step(60, 1 / 30);
    const slow = camera.position.length();

    fly.dispose();
    make({ moveSpeed: 10, damping: 0.8 });
    keyDown(env.win, "KeyW");
    step(288, 1 / 144);
    const fast = camera.position.length();

    assert.ok(Math.abs(slow - fast) / slow < 0.01);
  });
});

describe("look", () => {
  it("yaws with horizontal mouse movement and pitches with vertical", () => {
    make();
    drag(env.dom, env.win, 2, [[100, 0]]);
    step();
    assert.ok(Math.abs(aim().y - -100 * 0.0022) < 1e-9);

    drag(env.dom, env.win, 2, [[0, 50]]);
    step();
    assert.ok(Math.abs(aim().x - -50 * 0.0022) < 1e-9);
  });

  it("flips the vertical axis when invertY is set", () => {
    make({ invertY: true });
    drag(env.dom, env.win, 2, [[0, 50]]);
    step();
    assert.ok(aim().x > 0);
  });

  it("clamps pitch just short of straight up or down", () => {
    make({ maxPitch: 1 });
    drag(env.dom, env.win, 2, [[0, -100000]]);
    step();
    assert.ok(Math.abs(aim().x - 1) < 1e-9);

    drag(env.dom, env.win, 2, [[0, 100000]]);
    step();
    assert.ok(Math.abs(aim().x - -1) < 1e-9);
  });

  it("ignores movement once the button is up", () => {
    make();
    drag(env.dom, env.win, 2, [[100, 0]]);
    step();
    const settled = aim().y;
    env.win.dispatch("pointermove", { movementX: 500, movementY: 500 });
    step();
    assert.ok(Math.abs(aim().y - settled) < 1e-9);
  });

  it("ignores a plain left drag, which belongs to the app", () => {
    make();
    drag(env.dom, env.win, 0, [[100, 100]]);
    step();
    assert.ok(Math.abs(aim().y) < 1e-9);
    assert.ok(Math.abs(aim().x) < 1e-9);
  });
});

describe("pointer lock", () => {
  it("takes and releases the lock around a look drag", () => {
    make({ pointerLock: true });
    env.dom.dispatch("pointerdown", { button: 2 });
    assert.equal(env.doc.pointerLockElement, env.dom);
    env.win.dispatch("pointerup", { button: 2 });
    assert.equal(env.doc.pointerLockElement, null);
  });

  it("stays out of the way when pointerLock is false", () => {
    make({ pointerLock: false });
    env.dom.dispatch("pointerdown", { button: 2 });
    assert.equal(env.doc.pointerLockElement, null);
  });

  it("does not lock for orbit, which needs a visible cursor", () => {
    make({ pointerLock: true });
    env.dom.dispatch("pointerdown", { button: 0, altKey: true });
    assert.equal(env.doc.pointerLockElement, null);
  });
});

describe("pan", () => {
  it("slides the camera in its own screen plane on a middle drag", () => {
    make();
    drag(env.dom, env.win, 1, [[100, 0]]);
    assert.ok(camera.position.x < 0);
    assert.ok(Math.abs(camera.position.y) < 1e-9);

    const before = camera.position.y;
    drag(env.dom, env.win, 1, [[0, 100]]);
    assert.ok(camera.position.y > before);
  });
});

describe("wheel", () => {
  it("dollies toward the pivot and preventDefaults the page scroll", () => {
    make();
    const event = env.dom.dispatch("wheel", { deltaY: -100 });
    assert.equal(event.defaultPrevented, true);
    assert.ok(camera.position.z < 0);
  });

  it("dollies back out on the other direction", () => {
    make();
    env.dom.dispatch("wheel", { deltaY: 100 });
    assert.ok(camera.position.z > 0);
  });

  it("is a fly-speed throttle while a look drag is active", () => {
    make({ moveSpeed: 10, speedStep: 2 });
    env.dom.dispatch("pointerdown", { button: 2 });
    const parked = camera.position.clone();

    env.dom.dispatch("wheel", { deltaY: -100 });
    assert.equal(fly.moveSpeed, 20);
    env.dom.dispatch("wheel", { deltaY: 100 });
    assert.equal(fly.moveSpeed, 10);
    assert.ok(camera.position.distanceTo(parked) < 1e-9);
  });

  it("clamps the throttle to moveSpeedRange", () => {
    make({ moveSpeed: 10, speedStep: 4, moveSpeedRange: [5, 40] });
    env.dom.dispatch("pointerdown", { button: 2 });
    for (let i = 0; i < 10; i++) env.dom.dispatch("wheel", { deltaY: -100 });
    assert.equal(fly.moveSpeed, 40);
    for (let i = 0; i < 10; i++) env.dom.dispatch("wheel", { deltaY: 100 });
    assert.equal(fly.moveSpeed, 5);
  });
});

describe("orbit", () => {
  it("swings around the pivot without changing the distance to it", () => {
    make();
    fly.focus(new Vector3(0, 0, -10));
    step();
    const pivot = fly.pivot.clone();
    const radius = camera.position.distanceTo(pivot);

    drag(env.dom, env.win, 0, [[120, 0]], { altKey: true });

    assert.ok(Math.abs(camera.position.distanceTo(pivot) - radius) < 1e-6);
    assert.ok(fly.pivot.distanceTo(pivot) < 1e-6);
    assert.ok(Math.abs(camera.position.x) > 1e-6);
  });
});

describe("focus", () => {
  it("aims at a point and keeps the current distance", () => {
    make();
    fly.focus(new Vector3(3, 4, 5), 20);
    step();
    const distance = camera.position.distanceTo(new Vector3(3, 4, 5));
    assert.ok(Math.abs(distance - 20) < 1e-6);
  });

  it("backs off far enough to fit an object in the vertical field of view", () => {
    make();
    const mesh = new Mesh(new BoxGeometry(4, 4, 4), new MeshBasicMaterial());
    mesh.position.set(10, 0, 0);
    mesh.updateMatrixWorld();

    fly.focus(mesh);
    step();

    assert.ok(fly.pivot.distanceTo(new Vector3(10, 0, 0)) < 1e-6);
    const distance = camera.position.distanceTo(new Vector3(10, 0, 0));
    const halfFov = (camera.fov * Math.PI) / 360;
    const radius = Math.sqrt(3) * 2;
    assert.ok(distance > radius / Math.tan(halfFov));
  });

  it("leaves the camera alone for an object with no geometry", () => {
    make();
    const before = camera.position.clone();
    fly.focus(new Mesh());
    assert.ok(camera.position.distanceTo(before) < 1e-9);
  });

  it("is bound to F by default", () => {
    make();
    fly.focus(new Vector3(0, 0, -30), 30);
    step();
    camera.position.set(0, 0, 100);
    keyDown(env.win, "KeyF");
    assert.ok(Math.abs(camera.position.distanceTo(fly.pivot) - 30) < 1e-6);
  });
});

describe("placeAt", () => {
  it("jumps to a position", () => {
    make();
    fly.placeAt(new Vector3(1, 2, 3));
    assert.deepEqual(camera.position.toArray(), [1, 2, 3]);
  });

  it("points at a target and holds that aim through the next update", () => {
    make();
    fly.placeAt(new Vector3(0, 0, 10), new Vector3(0, 0, 0));
    step();
    const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    assert.ok(forward.distanceTo(new Vector3(0, 0, -1)) < 1e-6);
  });

  it("kills any velocity carried in from damping", () => {
    make({ moveSpeed: 10, damping: 0.9 });
    keyDown(env.win, "KeyW");
    step(10);
    keyUp(env.win, "KeyW");
    fly.placeAt(new Vector3(0, 0, 0));
    step(10);
    assert.ok(camera.position.length() < 1e-9);
  });
});

describe("enabled", () => {
  it("ignores input and stands still while false", () => {
    make({ moveSpeed: 10 });
    fly.enabled = false;

    keyDown(env.win, "KeyW");
    step(10, 1);
    drag(env.dom, env.win, 2, [[200, 200]]);
    env.dom.dispatch("wheel", { deltaY: -100 });

    assert.ok(camera.position.length() < 1e-9);
    assert.ok(Math.abs(aim().y) < 1e-9);
  });

  it("lets the page keep its context menu while disabled", () => {
    make();
    assert.equal(env.dom.dispatch("contextmenu").defaultPrevented, true);
    fly.enabled = false;
    assert.equal(env.dom.dispatch("contextmenu").defaultPrevented, false);
  });

  it("picks input back up when re-enabled", () => {
    make({ moveSpeed: 10 });
    fly.enabled = false;
    step(10);
    fly.enabled = true;
    keyDown(env.win, "KeyW");
    step(1, 1);
    assert.ok(Math.abs(camera.position.z - -10) < 1e-9);
  });
});

describe("dispose", () => {
  it("removes every listener it added", () => {
    make();
    fly.dispose();
    assert.equal(env.dom.count(), 0);
    assert.equal(env.win.count(), 0);
    assert.equal(env.doc.count(), 0);
    fly = undefined;
  });

  it("releases an active pointer lock", () => {
    make();
    env.dom.dispatch("pointerdown", { button: 2 });
    fly.dispose();
    assert.equal(env.doc.pointerLockElement, null);
    fly = undefined;
  });
});
