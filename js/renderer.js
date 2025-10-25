const SPRITE_SOURCES = {
  arturo: 'assets/sprites/arturo.png',
  la_nina: 'assets/sprites/la_nina.png',
  el_critico: 'assets/sprites/el_critico.png',
  burocrata: 'assets/sprites/burocrata.png',
  enemy_echo: 'assets/sprites/enemy_echo.png',
  anchor_fragmento: 'assets/sprites/anchor_fragmento.png',
  tile_ground: 'assets/sprites/tile_ground.png',
  tile_fracture: 'assets/sprites/tile_fracture.png',
  tile_ruin: 'assets/sprites/tile_ruin.png',
};

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
    this.sprites = {};
    this.assetsReady = false;
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  async loadAssets() {
    if (this.assetsReady) return;
    const entries = Object.entries(SPRITE_SOURCES);
    await Promise.all(entries.map(([key, src]) => this.#loadSingleSprite(key, src)));
    this.assetsReady = true;
  }

  async #loadSingleSprite(key, src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        this.sprites[key] = image;
        resolve();
      };
      image.onerror = () => {
        console.warn(`No se pudo cargar sprite ${src}`);
        resolve();
      };
      image.src = src;
    });
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
    if (color && this.sprites[color]) {
      const sprite = this.sprites[color];
      const scale = size / sprite.width;
      this.drawSprite({ name: color, x, y, anchor: 'top-left', scale });
    } else {
      this.ctx.fillStyle = color || '#0f0f0f';
      this.ctx.fillRect(x, y, size, size);
    }
  }

  drawRect({ x, y, width, height, color }) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  drawSanctuary({ x, y, width, height, active, pulse, label, intensity = 0 }) {
    const left = x - width / 2;
    const top = y - height / 2;
    const alphaBase = 0.18 + intensity * 0.35;
    const pulseAlpha = active ? 0.3 : Math.sin(pulse * Math.PI * 2) * 0.05;
    const fillAlpha = Math.min(0.6, Math.max(0.18, alphaBase + pulseAlpha));

    this.ctx.save();
    this.ctx.fillStyle = `rgba(96, 168, 255, ${fillAlpha})`;
    this.ctx.fillRect(left, top, width, height);

    this.ctx.lineWidth = active ? 2.5 : 1.5;
    this.ctx.strokeStyle = active ? 'rgba(204, 234, 255, 0.9)' : 'rgba(136, 188, 255, 0.7)';
    this.ctx.strokeRect(left, top, width, height);

    if (label) {
      this.ctx.font = '8px monospace';
      this.ctx.fillStyle = 'rgba(226, 239, 255, 0.85)';
      this.ctx.fillText(label, left + 4, top + 10);
    }
    this.ctx.restore();
  }

  drawAnchor({ x, y, glow, visible, fade }) {
    if (this.sprites.anchor_fragmento) {
      if (visible) {
        this.drawSprite({ name: 'anchor_fragmento', x, y, scale: 1, opacity: 1 });
      } else if (!visible && fade > 0) {
        this.drawSprite({ name: 'anchor_fragmento', x, y, scale: 1, opacity: fade });
      }
    } else {
      this.ctx.fillStyle = `rgba(247, 224, 125, ${visible ? 1 : fade})`;
      this.ctx.fillRect(x - 8, y - 8, 16, 16);
    }

    if (glow) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 238, 170, 0.45)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x - 10, y - 10, 20, 20);
      this.ctx.restore();
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

  drawSprite({ name, x, y, scale = 1, opacity = 1, anchor = 'center' }) {
    const sprite = this.sprites[name];
    if (!sprite) {
      return;
    }
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    let drawX = x;
    let drawY = y;
    if (anchor === 'center') {
      drawX = x - width / 2;
      drawY = y - height / 2;
    }
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.drawImage(sprite, drawX, drawY, width, height);
    this.ctx.restore();
  }
}
