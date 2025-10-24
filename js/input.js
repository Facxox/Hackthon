export class InputHandler {
  constructor() {
    this.keys = new Set();
    this.attackPressed = false;
    this.interactPressed = false;
    this.touchState = { x: 0, y: 0 };
    this.#bindEvents();
    this.#createTouchControls();
  }

  getDirection() {
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

  #createTouchControls() {
    const controls = document.createElement('div');
    controls.className = 'mobile-controls';

    const directions = [
      { label: '↑', x: 0, y: -1 },
      { label: '↓', x: 0, y: 1 },
      { label: '←', x: -1, y: 0 },
      { label: '→', x: 1, y: 0 },
    ];

    directions.forEach((dir) => {
      const btn = document.createElement('button');
      btn.className = 'mobile-button';
      btn.textContent = dir.label;
      btn.addEventListener('touchstart', (event) => {
        event.preventDefault();
        this.touchState = { x: dir.x, y: dir.y };
      });
      btn.addEventListener('touchend', (event) => {
        event.preventDefault();
        this.touchState = { x: 0, y: 0 };
      });
      controls.appendChild(btn);
    });

    const interactBtn = document.createElement('button');
    interactBtn.className = 'mobile-button';
    interactBtn.textContent = 'E';
    interactBtn.addEventListener('touchstart', (event) => {
      event.preventDefault();
      this.interactPressed = true;
    });

    const attackBtn = document.createElement('button');
    attackBtn.className = 'mobile-button';
    attackBtn.textContent = '⚔';
    attackBtn.addEventListener('touchstart', (event) => {
      event.preventDefault();
      this.attackPressed = true;
    });

    controls.append(interactBtn, attackBtn);

    document.body.appendChild(controls);
  }
}
