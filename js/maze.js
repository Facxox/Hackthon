const MAZE_LEVELS = [
  {
    label: 'Suave',
    grid: [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ],
    start: { row: 7, col: 1 },
    exit: { row: 1, col: 5 },
  },
  {
    label: 'Profundo',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    start: { row: 7, col: 1 },
    exit: { row: 1, col: 9 },
  },
  {
    label: 'Tormenta',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    start: { row: 9, col: 1 },
    exit: { row: 1, col: 9 },
  },
];

export class MazeMinigame {
  constructor({ overlayElement, canvasElement, onComplete }) {
    this.overlay = overlayElement;
    this.canvas = canvasElement;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.onComplete = onComplete;
    this.isActive = false;
    this.pulse = 0;
    this.cellSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.levelElement = this.overlay?.querySelector('[data-maze-level]') || null;
    this.progressElement = this.overlay?.querySelector('[data-maze-progress]') || null;
    this.totalLevels = MAZE_LEVELS.length;

    const { level, index } = this.#getLevel(0);
    this.levelIndex = index;
    this.cols = level.grid[0].length;
    this.rows = level.grid.length;
    this.grid = level.grid.map((row) => [...row]);
    this.playerPos = { ...level.start };
    this.exitPos = { ...level.exit };
    this.keyHandler = this.#handleKeyDown.bind(this);
    this.animationFrame = null;
    this.#refreshMetrics();
    this.#updateDescriptors();
    this.setProgress(0, this.totalLevels);
  }

  open(levelIndex = 0) {
    const { level, index } = this.#getLevel(levelIndex);
    this.levelIndex = index;
    this.grid = level.grid.map((row) => [...row]);
    this.playerPos = { ...level.start };
    this.exitPos = { ...level.exit };
    this.cols = level.grid[0].length;
    this.rows = level.grid.length;
    this.pulse = 0;
    this.isActive = true;
    this.#refreshMetrics();
    this.#updateDescriptors();
    this.overlay.classList.add('visible');
    window.addEventListener('keydown', this.keyHandler, true);
    this.#render();
  }

  close(success = false) {
    if (!this.isActive) return;
    this.isActive = false;
    this.overlay.classList.remove('visible');
    window.removeEventListener('keydown', this.keyHandler, true);
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (typeof this.onComplete === 'function') {
      this.onComplete(success);
    }
  }

  update(deltaTime) {
    if (!this.isActive) return;
    this.pulse = (this.pulse + deltaTime * 0.6) % 1;
    this.#render();
  }

  setProgress(current, total = this.totalLevels) {
    if (!this.progressElement) {
      return;
    }
    const safeTotal = Math.max(0, total);
    const maxCurrent = safeTotal > 0 ? Math.min(current, safeTotal) : 0;
    const safeCurrent = Math.max(0, maxCurrent);
    this.progressElement.textContent = `Progreso ${safeCurrent}/${safeTotal || 0}`;
  }

  getLevelCount() {
    return this.totalLevels;
  }

  #getLevel(index) {
    if (MAZE_LEVELS.length === 0) {
      return {
        level: {
          grid: [[0]],
          start: { row: 0, col: 0 },
          exit: { row: 0, col: 0 },
          label: 'Único',
        },
        index: 0,
      };
    }

    const normalized = Number.isFinite(index)
      ? Math.max(0, Math.min(MAZE_LEVELS.length - 1, Math.floor(index)))
      : 0;

    return { level: MAZE_LEVELS[normalized], index: normalized };
  }

  #updateDescriptors() {
    if (!this.levelElement) {
      return;
    }
    const total = this.totalLevels || 1;
    const clampedIndex = Math.min(this.levelIndex, total - 1);
    const { level } = this.#getLevel(clampedIndex);
    const displayIndex = clampedIndex + 1;
    const label = level.label || 'Recuerdo';
    this.levelElement.textContent = `Nivel ${displayIndex} · ${label}`;
  }

  #refreshMetrics() {
    if (!this.canvas || !this.cols || !this.rows) {
      return;
    }

    const widthUnit = this.canvas.width / this.cols;
    const heightUnit = this.canvas.height / this.rows;
    const baseSize = Math.floor(Math.min(widthUnit, heightUnit));
    this.cellSize = Math.max(8, baseSize || 0);

    const totalWidth = this.cellSize * this.cols;
    const totalHeight = this.cellSize * this.rows;
    this.offsetX = Math.floor((this.canvas.width - totalWidth) / 2);
    this.offsetY = Math.floor((this.canvas.height - totalHeight) / 2);
  }

  #handleKeyDown(event) {
    if (!this.isActive) return;
    const { code } = event;
    if (code === 'Escape') {
      event.preventDefault();
      this.close(false);
      return;
    }

    let movement = null;
    if (code === 'ArrowUp' || code === 'KeyW') {
      movement = { row: -1, col: 0 };
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      movement = { row: 1, col: 0 };
    } else if (code === 'ArrowLeft' || code === 'KeyA') {
      movement = { row: 0, col: -1 };
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      movement = { row: 0, col: 1 };
    }

    if (!movement) {
      return;
    }

    event.preventDefault();

    const nextRow = this.playerPos.row + movement.row;
    const nextCol = this.playerPos.col + movement.col;

    if (!this.#isWalkable(nextRow, nextCol)) {
      return;
    }

    this.playerPos = { row: nextRow, col: nextCol };
    this.#render();

    if (this.playerPos.row === this.exitPos.row && this.playerPos.col === this.exitPos.col) {
      setTimeout(() => this.close(true), 120);
    }
  }

  #isWalkable(row, col) {
    return (
      row >= 0 &&
      col >= 0 &&
      row < this.grid.length &&
      col < this.grid[0].length &&
      this.grid[row][col] === 0
    );
  }

  #render() {
    if (!this.ctx) {
      return;
    }

    const cols = this.grid[0].length;
    const rows = this.grid.length;
    const size = this.cellSize;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = this.offsetX + col * size;
        const y = this.offsetY + row * size;
        if (this.grid[row][col] === 1) {
          ctx.fillStyle = 'rgba(12, 14, 22, 0.92)';
        } else {
          const glow = 0.2 + (Math.sin((row + col) + this.pulse * Math.PI * 2) + 1) * 0.18;
          ctx.fillStyle = `rgba(58, 82, 122, ${0.35 + glow})`;
        }
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = 'rgba(16, 20, 32, 0.7)';
        ctx.strokeRect(x, y, size, size);
      }
    }

    ctx.fillStyle = 'rgba(248, 225, 108, 0.85)';
    ctx.fillRect(
      this.offsetX + this.exitPos.col * size + 3,
      this.offsetY + this.exitPos.row * size + 3,
      size - 6,
      size - 6,
    );

    ctx.fillStyle = 'rgba(240, 248, 255, 0.9)';
    ctx.fillRect(
      this.offsetX + this.playerPos.col * size + 4,
      this.offsetY + this.playerPos.row * size + 4,
      size - 8,
      size - 8,
    );
  }
}
