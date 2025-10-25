export class InputHandler {
  constructor() {
    this.keys = new Set();
    this.attackPressed = false;
    this.interactPressed = false;
    this.touchState = { x: 0, y: 0 };
    this.movementLocked = false;
    this.#bindEvents();
  }

  getDirection() {
    if (this.movementLocked) {
      return { x: 0, y: 0 };
    }
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;

    if (this.touchState.y !== 0 || this.touchState.x !== 0) {
      x += this.touchState.x;
      y += this.touchState.y;
    }

    return { x, y };
  }

  consumeAttack() {
    if (this.attackPressed) {
      this.attackPressed = false;
      return true;
    }
    return false;
  }

  setMovementLocked(locked) {
    this.movementLocked = locked;
    if (locked) {
      this.keys.clear();
    }
  }

  consumeInteraction() {
    if (this.interactPressed) {
      this.interactPressed = false;
      return true;
    }
    return false;
  }

  #bindEvents() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      if (event.code === 'Space') {
        event.preventDefault();
        this.attackPressed = true;
      } else if (event.code === 'KeyE') {
        this.interactPressed = true;
      } else {
        this.keys.add(event.code);
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
      }
      this.keys.delete(event.code);
    });

    window.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.attackPressed = true;
      }
    });

    window.addEventListener('touchstart', () => {
      // Previene zoom accidental
    }, { passive: true });
  }

  #createTouchControls() {}
}
