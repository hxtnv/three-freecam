import { Box3, Euler, Matrix4, Object3D, Quaternion, Sphere, Vector3 } from "three";
import type { Camera, PerspectiveCamera } from "three";

export interface FreeCamKeys {
  forward: string[];
  back: string[];
  left: string[];
  right: string[];
  up: string[];
  down: string[];
  boost: string[];
  focus: string[];
}

export interface FreeCamOptions {
  /** Base fly speed in world units per second. Adjustable at runtime with the scroll wheel. */
  moveSpeed?: number;
  /** Multiplier while the boost key is held. */
  boost?: number;
  /** Look sensitivity in radians per pixel of mouse movement. */
  lookSpeed?: number;
  /** Pan speed in world units per pixel, scaled by distance to the pivot. */
  panSpeed?: number;
  /** Fraction of the distance to the pivot covered by one wheel notch. */
  zoomSpeed?: number;
  /** How far a scroll while looking changes the fly speed, per notch. */
  speedStep?: number;
  moveSpeedRange?: [number, number];
  /**
   * Movement smoothing. 0 is instant, like the Unity scene view, and is the default. Raise it
   * toward 1 for the drifting glide you want when recording a flythrough.
   */
  damping?: number;
  /** Invert vertical look. */
  invertY?: boolean;
  /** Clamp on pitch, in radians. */
  maxPitch?: number;
  keys?: Partial<FreeCamKeys>;
  /** Take pointer lock while dragging, so the look never runs out of screen. */
  pointerLock?: boolean;
}

const DEFAULT_KEYS: FreeCamKeys = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  up: ["KeyE", "Space"],
  down: ["KeyQ"],
  boost: ["ShiftLeft", "ShiftRight"],
  focus: ["KeyF"],
};

type Drag = "none" | "look" | "pan" | "orbit";

const _box = new Box3();
const _sphere = new Sphere();
const _offset = new Vector3();
const _quat = new Quaternion();
const _matrix = new Matrix4();

/**
 * A debug camera for three.js: editor-style scene-view controls, the way Unity, Unreal and
 * Godot do it.
 *
 * Right drag to look and WASD to fly, middle drag to pan, alt + left drag to orbit, wheel to
 * dolly, F to frame the focus target.
 *
 * Construct it once, then call {@link FreeCam.update} with the frame delta in seconds.
 */
export class FreeCam {
  enabled = true;
  moveSpeed: number;
  boost: number;
  lookSpeed: number;
  panSpeed: number;
  zoomSpeed: number;
  speedStep: number;
  moveSpeedRange: [number, number];
  damping: number;
  invertY: boolean;
  maxPitch: number;
  pointerLock: boolean;

  /** What orbit turns around and what the wheel dollies toward. Follows the camera otherwise. */
  readonly pivot = new Vector3();

  private readonly camera: Camera;
  private readonly dom: HTMLElement;
  private readonly keymap: FreeCamKeys;
  private readonly held = new Set<string>();
  private readonly euler = new Euler(0, 0, 0, "YXZ");
  private readonly velocity = new Vector3();
  private readonly scratch = new Vector3();

  private drag: Drag = "none";
  private pivotDistance = 10;
  private locked = false;

  constructor(camera: Camera, dom: HTMLElement, options: FreeCamOptions = {}) {
    this.camera = camera;
    this.dom = dom;
    this.moveSpeed = options.moveSpeed ?? 12;
    this.boost = options.boost ?? 4;
    this.lookSpeed = options.lookSpeed ?? 0.0022;
    this.panSpeed = options.panSpeed ?? 0.0015;
    this.zoomSpeed = options.zoomSpeed ?? 0.12;
    this.speedStep = options.speedStep ?? 1.15;
    this.moveSpeedRange = options.moveSpeedRange ?? [0.1, 500];
    this.damping = options.damping ?? 0;
    this.invertY = options.invertY ?? false;
    this.maxPitch = options.maxPitch ?? Math.PI / 2 - 0.01;
    this.pointerLock = options.pointerLock ?? true;
    this.keymap = { ...DEFAULT_KEYS, ...options.keys };

    this.euler.setFromQuaternion(camera.quaternion);
    this.syncPivot();

    dom.addEventListener("pointerdown", this.onPointerDown);
    dom.addEventListener("wheel", this.onWheel, { passive: false });
    dom.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
  }

  /** Call once per frame with the frame delta in seconds. */
  update(dt: number): void {
    if (!this.enabled) return;

    const speed =
      this.moveSpeed * (this.isHeld(this.keymap.boost) ? this.boost : 1);
    const move = this.scratch.set(
      this.axis(this.keymap.right, this.keymap.left),
      this.axis(this.keymap.up, this.keymap.down),
      this.axis(this.keymap.back, this.keymap.forward),
    );

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      const vertical = move.y;
      move.y = 0;
      move.applyQuaternion(this.camera.quaternion);
      move.y += vertical;
    }

    if (this.damping <= 0) {
      this.velocity.copy(move);
    } else {
      // Framerate independent, so the same value feels the same at 30 and 144 fps.
      this.velocity.lerp(move, 1 - Math.pow(this.damping, dt * 60));
    }
    this.camera.position.addScaledVector(this.velocity, dt);

    this.camera.quaternion.setFromEuler(this.euler);
    if (this.drag !== "orbit") this.syncPivot();
  }

  /** Points the camera at something and backs off far enough to see all of it. */
  focus(target: Object3D | Vector3, distance?: number): void {
    if (target instanceof Vector3) {
      this.pivot.copy(target);
      this.pivotDistance = distance ?? this.pivotDistance;
    } else {
      _box.setFromObject(target);
      if (_box.isEmpty()) return;
      _box.getBoundingSphere(_sphere);
      this.pivot.copy(_sphere.center);
      const fov = (this.camera as PerspectiveCamera).fov ?? 50;
      this.pivotDistance =
        distance ?? (_sphere.radius * 1.6) / Math.tan((fov * Math.PI) / 360);
    }
    _offset
      .set(0, 0, 1)
      .applyQuaternion(this.camera.quaternion)
      .multiplyScalar(this.pivotDistance);
    this.camera.position.copy(this.pivot).add(_offset);
    this.velocity.set(0, 0, 0);
  }

  /** Jumps the camera somewhere, optionally pointing it at a target. */
  placeAt(position: Vector3, lookAt?: Vector3): void {
    this.camera.position.copy(position);
    this.velocity.set(0, 0, 0);
    if (lookAt) {
      _matrix.lookAt(position, lookAt, this.camera.up);
      _quat.setFromRotationMatrix(_matrix);
      this.euler.setFromQuaternion(_quat);
    }
    this.syncPivot();
  }

  dispose(): void {
    this.releaseLock();
    this.dom.removeEventListener("pointerdown", this.onPointerDown);
    this.dom.removeEventListener("wheel", this.onWheel);
    this.dom.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    this.held.clear();
  }

  private isHeld(codes: string[]): boolean {
    for (const code of codes) if (this.held.has(code)) return true;
    return false;
  }

  private axis(positive: string[], negative: string[]): number {
    return (this.isHeld(positive) ? 1 : 0) - (this.isHeld(negative) ? 1 : 0);
  }

  private syncPivot(): void {
    this.pivot
      .set(0, 0, -this.pivotDistance)
      .applyQuaternion(this.camera.quaternion)
      .add(this.camera.position);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    if (event.button === 2) this.drag = "look";
    else if (event.button === 1) this.drag = "pan";
    else if (event.button === 0 && event.altKey) this.drag = "orbit";
    else return;

    event.preventDefault();
    if (this.pointerLock && this.drag !== "orbit") {
      void this.dom.requestPointerLock?.();
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.drag === "none" || !this.enabled) return;
    const dx = event.movementX ?? 0;
    const dy = event.movementY ?? 0;
    if (dx === 0 && dy === 0) return;

    if (this.drag === "pan") {
      const scale = this.panSpeed * Math.max(this.pivotDistance, 1);
      this.scratch
        .set(-dx * scale, dy * scale, 0)
        .applyQuaternion(this.camera.quaternion);
      this.camera.position.add(this.scratch);
      return;
    }

    this.rotate(dx, dy);
    if (this.drag === "orbit") {
      _quat.setFromEuler(this.euler);
      _offset.set(0, 0, this.pivotDistance).applyQuaternion(_quat);
      this.camera.position.copy(this.pivot).add(_offset);
      this.velocity.set(0, 0, 0);
    }
  };

  private rotate(dx: number, dy: number): void {
    const sign = this.invertY ? -1 : 1;
    this.euler.y -= dx * this.lookSpeed;
    this.euler.x -= dy * this.lookSpeed * sign;
    this.euler.x = Math.max(
      -this.maxPitch,
      Math.min(this.maxPitch, this.euler.x),
    );
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (this.drag === "none") return;
    const released =
      (this.drag === "look" && event.button === 2) ||
      (this.drag === "pan" && event.button === 1) ||
      (this.drag === "orbit" && event.button === 0);
    if (!released) return;
    this.drag = "none";
    this.releaseLock();
  };

  private onWheel = (event: WheelEvent): void => {
    if (!this.enabled) return;
    event.preventDefault();
    const notches = -Math.sign(event.deltaY);

    // While looking, the wheel is a throttle rather than a dolly, same as the editor.
    if (this.drag === "look") {
      const [min, max] = this.moveSpeedRange;
      const next = this.moveSpeed * Math.pow(this.speedStep, notches);
      this.moveSpeed = Math.max(min, Math.min(max, next));
      return;
    }

    const step = this.pivotDistance * this.zoomSpeed * notches;
    this.scratch
      .set(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
      .multiplyScalar(step);
    this.camera.position.add(this.scratch);
    this.pivotDistance = Math.max(0.1, this.pivotDistance - step);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    this.held.add(event.code);
    if (this.keymap.focus.includes(event.code)) this.focus(this.pivot);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.held.delete(event.code);
  };

  private onBlur = (): void => {
    this.held.clear();
    this.drag = "none";
    this.releaseLock();
  };

  private onContextMenu = (event: Event): void => {
    if (this.enabled) event.preventDefault();
  };

  private onPointerLockChange = (): void => {
    this.locked = document.pointerLockElement === this.dom;
  };

  private releaseLock(): void {
    if (this.locked) document.exitPointerLock?.();
    this.locked = false;
  }
}
