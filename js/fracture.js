export class FractureSystem {
  constructor() {
    this.coherence = 100;
    this.baseDecay = 0.05;
    this.maxDecay = 3.5;
    this.stabilizeTimer = 0;
    this.elapsedTime = 0;
    this.totalStress = 0;
    this.interactionScore = 0;
    this.surgeTimer = 0;
  this.surgeBaseRange = { min: 26, max: 48 };
  this.surgeIntenseRange = { min: 6, max: 14 };
  this.surgeTimer = this.#rollSurgeInterval(0);
    this.pendingHealthDamage = 0;
    this.lowCoherenceTimer = 0;
  this.surgeCount = 0;
  this.pendingMessages = [];
  }

  update(deltaTime) {
    this.elapsedTime += deltaTime;
    const exposure = this.#getExposureLevel();

    if (this.stabilizeTimer > 0) {
      this.stabilizeTimer -= deltaTime;
      if (this.stabilizeTimer <= 0) {
        this.stabilizeTimer = 0;
      }
    } else {
      const decay = this.baseDecay + (this.maxDecay - this.baseDecay) * exposure;
      this.coherence = Math.max(0, this.coherence - decay * deltaTime);
    }

    if (this.stabilizeTimer > 0) {
      this.surgeTimer = Math.max(this.surgeTimer, 3);
      this.lowCoherenceTimer = 0;
    } else {
      this.surgeTimer -= deltaTime;
      if (this.surgeTimer <= 0) {
        this.#triggerSurge(exposure);
        this.surgeTimer = this.#rollSurgeInterval(exposure);
      }
      if (this.coherence < 35) {
        this.lowCoherenceTimer += deltaTime;
        const interval = this.#lerp(11, 2.4, exposure);
        if (this.lowCoherenceTimer >= interval) {
          const sustainedImpact = this.#lerp(3.5, 9, exposure) * (this.coherence < 20 ? 1.25 : 1);
          this.pendingHealthDamage += sustainedImpact;
          this.lowCoherenceTimer = 0;
        }
      } else if (this.lowCoherenceTimer > 0) {
        this.lowCoherenceTimer = Math.max(0, this.lowCoherenceTimer - deltaTime * 0.5);
      }
    }
  }

  addStress(amount, { escalate = true } = {}) {
    this.coherence = Math.max(0, this.coherence - amount);
    if (escalate) {
      this.totalStress += amount;
    }
  }

  stabilize(duration) {
    this.coherence = 100;
    this.stabilizeTimer = duration;
    this.surgeTimer = Math.max(this.surgeTimer, 6);
    this.lowCoherenceTimer = 0;
  }

  registerInteraction(weight = 5) {
    this.interactionScore += weight;
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

  #triggerSurge(exposure) {
    const base = this.#lerp(6, 18, exposure);
    const variance = this.#lerp(4, 14, exposure) * Math.random();
    this.addStress(base + variance, { escalate: false });
    const healthImpact = this.#lerp(2.2, 7.8, exposure) * (this.coherence < 40 ? 1.2 : 1);
    this.pendingHealthDamage += healthImpact;
    this.surgeCount += 1;
    if (this.surgeCount <= 3) {
      this.pendingMessages.push('El estrés me hace daño.');
    }
  }

  #rollSurgeInterval(exposure) {
    const min = this.#lerp(this.surgeBaseRange.min, this.surgeIntenseRange.min, exposure);
    const max = this.#lerp(this.surgeBaseRange.max, this.surgeIntenseRange.max, exposure);
    return min + Math.random() * Math.max(1, max - min);
  }

  #getExposureLevel() {
    const timeFactor = Math.min(1, this.elapsedTime / 420);
    const stressFactor = Math.min(1, this.totalStress / 400);
    const interactionFactor = Math.min(1, this.interactionScore / 40);
    return Math.min(1, timeFactor * 0.4 + stressFactor * 0.4 + interactionFactor * 0.2);
  }

  #lerp(a, b, t) {
    return a + (b - a) * Math.min(1, Math.max(0, t));
  }

  consumePendingHealthDamage() {
    const damage = this.pendingHealthDamage;
    this.pendingHealthDamage = 0;
    return damage;
  }

  consumePendingMessages() {
    if (this.pendingMessages.length === 0) {
      return [];
    }
    const messages = [...this.pendingMessages];
    this.pendingMessages.length = 0;
    return messages;
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
