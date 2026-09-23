// Minimal DOM stand-in so FreeCam can be exercised under node:test without a browser
// or a headless-DOM dependency. It implements only the surface FreeCam touches.
//
// This lives outside test/ on purpose: the node:test runner treats every .js file under a
// directory named test as a test file, and a helper with no tests in it would be reported
// as an empty one.

class StubTarget {
  constructor(name) {
    this.name = name;
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(handler);
  }

  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }

  /** Total live listeners, used to prove dispose() cleans up after itself. */
  count() {
    let total = 0;
    for (const set of this.listeners.values()) total += set.size;
    return total;
  }

  dispatch(type, event = {}) {
    const payload = { type, defaultPrevented: false, ...event };
    payload.preventDefault = () => {
      payload.defaultPrevented = true;
    };
    for (const handler of [...(this.listeners.get(type) ?? [])]) handler(payload);
    return payload;
  }
}

/**
 * Installs stub globals and returns the handles a test needs.
 * Call the returned teardown() in an afterEach so tests stay isolated.
 */
export function installDom() {
  const win = new StubTarget("window");
  const doc = new StubTarget("document");
  const dom = new StubTarget("canvas");

  doc.pointerLockElement = null;
  doc.exitPointerLock = () => {
    doc.pointerLockElement = null;
    doc.dispatch("pointerlockchange");
  };

  dom.requestPointerLock = () => {
    doc.pointerLockElement = dom;
    doc.dispatch("pointerlockchange");
    return Promise.resolve();
  };

  const previous = {
    window: globalThis.window,
    document: globalThis.document,
  };

  globalThis.window = win;
  globalThis.document = doc;

  return {
    win,
    doc,
    dom,
    teardown() {
      globalThis.window = previous.window;
      globalThis.document = previous.document;
    },
  };
}

/** Holds a key down for the duration of one or more update() calls. */
export function keyDown(win, code) {
  win.dispatch("keydown", { code });
}

export function keyUp(win, code) {
  win.dispatch("keyup", { code });
}

/** Right button is 2, middle is 1, left is 0. */
export function drag(dom, win, button, moves, { altKey = false } = {}) {
  dom.dispatch("pointerdown", { button, altKey });
  for (const [movementX, movementY] of moves) {
    win.dispatch("pointermove", { movementX, movementY });
  }
  win.dispatch("pointerup", { button });
}
