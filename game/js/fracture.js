export class FractureSystem {
  constructor() {
    this.coherence = 100;
    this.decayRate = 2;
    this.stabilizeTimer = 0;
  }

  update(deltaTime) {
    if (this.stabilizeTimer > 0) {
      this.stabilizeTimer -= deltaTime;
      if (this.stabilizeTimer <= 0) {
        this.stabilizeTimer = 0;
      }
    } else {
      this.coherence = Math.max(0, this.coherence - this.decayRate * deltaTime);
    }
  }

  addStress(amount) {
    this.coherence = Math.max(0, this.coherence - amount);
  }

  stabilize(duration) {
    this.coherence = 100;
    this.stabilizeTimer = duration;
  }

  applyEffects(renderer) {
    const level = this.#getLevel();
    renderer.setFractureEffects({
      shakeIntensity: level.shake,
      overlayIntensity: level.overlay,
      blur: level.blur,
      chromaticOffset: level.chromatic,
    });
  }

  needsCriticSummon() {
    return this.coherence <= 19;
  }

  #getLevel() {
    if (this.coherence >= 80) {
      return { shake: 0, overlay: 0, blur: 0, chromatic: 0 };
    }
    if (this.coherence >= 60) {
      return { shake: 2, overlay: 0.1, blur: 0.5, chromatic: 0.5 };
    }
    if (this.coherence >= 40) {
      return { shake: 4, overlay: 0.25, blur: 1, chromatic: 1.5 };
    }
    if (this.coherence >= 20) {
      return { shake: 6, overlay: 0.45, blur: 1.5, chromatic: 2.5 };
    }
    return { shake: 9, overlay: 0.7, blur: 2.5, chromatic: 3.5 };
  }
}
