export class Renderer {
  constructor(canvas, fractureOverlay) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fractureOverlay = fractureOverlay;
    this.virtualWidth = 320;
    this.virtualHeight = 180;
    this.scale = 1;
    this.camera = { x: 0, y: 0 };
    this.effects = { shakeIntensity: 0, overlayIntensity: 0, blur: 0, chromaticOffset: 0 };
    this.shakeOffset = { x: 0, y: 0 };
    this.backgroundColor = '#070a12';
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const { innerWidth, innerHeight } = window;
    const scaleX = Math.max(1, Math.floor(innerWidth / this.virtualWidth));
    const scaleY = Math.max(1, Math.floor(innerHeight / this.virtualHeight));
    this.scale = Math.max(1, Math.min(scaleX, scaleY));
    this.canvas.width = this.virtualWidth * this.scale;
    this.canvas.height = this.virtualHeight * this.scale;
  }

  beginFrame() {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const shakeX = (Math.random() - 0.5) * this.effects.shakeIntensity;
    const shakeY = (Math.random() - 0.5) * this.effects.shakeIntensity;
    this.shakeOffset = { x: shakeX, y: shakeY };

    this.ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
    this.ctx.scale(this.scale, this.scale);
    this.ctx.translate(this.virtualWidth / 2, this.virtualHeight / 2);
    this.ctx.translate(-this.camera.x, -this.camera.y);
  }

  endFrame() {
    this.ctx.restore();
    if (this.fractureOverlay) {
      this.fractureOverlay.style.opacity = this.effects.overlayIntensity;
      this.fractureOverlay.style.filter = `blur(${this.effects.blur}px)`;
    }
  }

  setCamera(target) {
    this.camera.x = target.x;
    this.camera.y = target.y;
  }

  setFractureEffects(effects) {
    this.effects = { ...this.effects, ...effects };
  }

  drawTile({ x, y, size, color }) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, size, size);
  }

  drawRect({ x, y, width, height, color }) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  drawAnchor({ x, y, glow, visible, fade }) {
    if (visible) {
      this.ctx.fillStyle = '#f7e07d';
      this.ctx.fillRect(x - 8, y - 8, 16, 16);
    }
    if (!visible) {
      this.ctx.fillStyle = `rgba(247, 224, 125, ${fade})`;
      this.ctx.fillRect(x - 8, y - 8, 16, 16);
    }
    if (glow) {
      this.ctx.strokeStyle = 'rgba(255, 238, 170, 0.6)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x - 10, y - 10, 20, 20);
    }
  }

  drawFloatingText({ x, y, text, color }) {
    this.ctx.font = '8px monospace';
    this.ctx.fillStyle = '#000';
    this.ctx.fillText(text, x - 10, y);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x - 11, y - 1);
  }

  drawEyes({ x, y, intensity }) {
    this.ctx.fillStyle = `rgba(255, 20, 20, ${0.6 + intensity * 0.4})`;
    this.ctx.fillRect(x - 4, y - 4, 3, 3);
    this.ctx.fillRect(x + 1, y - 4, 3, 3);
  }
}
