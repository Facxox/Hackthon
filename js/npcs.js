class NPC {
  constructor({ x, y, speed = 20, color = '#8a8a8a', name = 'NPC', sprite = null }) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.baseColor = color;
    this.name = name;
    this.width = 14;
    this.height = 14;
    this.dialogue = null;
    this.dialogueTimer = 0;
    this.visible = true;
    this.sprite = sprite;
  }

  update(deltaTime, context) {
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= deltaTime;
      if (this.dialogueTimer <= 0) {
        this.dialogue = null;
      }
    }
  }

  render(renderer) {
    if (!this.visible) return;
    if (this.sprite) {
      renderer.drawSprite({ name: this.sprite, x: this.x, y: this.y, scale: 1 });
    } else {
      renderer.drawRect({
        x: this.x - this.width / 2,
        y: this.y - this.height / 2,
        width: this.width,
        height: this.height,
        color: this.baseColor,
      });
    }
    if (this.dialogue) {
      renderer.drawFloatingText({
        x: this.x,
        y: this.y - 22,
        text: this.dialogue,
        color: '#f8dcdc',
      });
    }
  }

  showDialogue(text, duration = 3.5) {
    this.dialogue = text;
    this.dialogueTimer = duration;
  }
}

export class LaNina extends NPC {
  constructor(config) {
    super({ ...config, color: '#fbee7b', name: 'La Nina', sprite: 'la_nina' });
    this.reappearTimer = 0;
    this.dialogueCooldown = 1.2 + Math.random() * 2;
    this.silenceTimer = 0.5 + Math.random();
    this.phrases = [
      'Me mataste.',
      'Morí por tu culpa.',
      'No volví contigo.',
      'Te esperé ardiendo.',
      '¿Recuerdas el humo?',
      'No apagaste nada.',
      'Me dejaste sola.',
    ];
  }

  update(deltaTime, { player, anchors }) {
    super.update(deltaTime);
    if (!this.visible) {
      this.reappearTimer -= deltaTime;
      if (this.reappearTimer <= 0) {
        this.#repositionNearAnchor(anchors);
        this.visible = true;
      }
      return;
    }

    const distance = Math.hypot(player.x - this.x, player.y - this.y);

    if (distance < 36) {
      this.silenceTimer -= deltaTime;
      this.dialogueCooldown -= deltaTime;

      if (this.dialogueTimer <= 0 && this.dialogueCooldown <= 0) {
        const phrase = this.phrases[Math.floor(Math.random() * this.phrases.length)];
        this.showDialogue(phrase, 3.8);
        this.dialogueCooldown = 3 + Math.random() * 2.2;
        this.silenceTimer = 1 + Math.random() * 1.4;
      } else if (this.dialogueTimer <= 0 && this.silenceTimer <= 0) {
        this.dialogueCooldown = 2 + Math.random() * 2.4;
        this.silenceTimer = 1 + Math.random() * 1.4;
      }
    } else {
      this.dialogueCooldown = Math.max(this.dialogueCooldown, 1.8);
      this.silenceTimer = Math.max(this.silenceTimer, 1.2);
    }
  }

  #repositionNearAnchor(anchors) {
    if (!anchors || anchors.length === 0) return;
    const available = anchors.filter((anchor) => !anchor.isCollected);
    const target = available[Math.floor(Math.random() * available.length)] || anchors[0];
    this.x = target.position.x + (Math.random() - 0.5) * 80;
    this.y = target.position.y + (Math.random() - 0.5) * 80;
  }
}

export class ElCritico extends NPC {
  constructor(config, dialogues) {
    super({ ...config, color: '#202020', name: 'El Critico', sprite: 'el_critico' });
    this.dialogues = dialogues || {};
    this.speed = 35;
    this.eyesPulse = 0;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.baseRadius = 46;
    this.quickTaunts = [
      'Cobarde.',
      'Otra vez huyes?',
      'Mira tus manos.',
      'Nada cambió.',
      'Respira, si puedes.',
      'Qué vas a decirle?',
      'Siempre fallas.',
      'No basta.',
      'Es tu culpa.',
      'Mientes.',
    ];
    this.tauntCooldown = 0;
  }

  update(deltaTime, {
    player,
    fracture,
    shelters = [],
    playerInsideShelter = false,
  }) {
    super.update(deltaTime);
    if (!player) return;
    const coherence = fracture?.coherence ?? 100;
    const aggressive = coherence < 40;
    const speedMultiplier = aggressive ? 1.35 : 0.85;
    const moveSpeed = this.speed * speedMultiplier;
    this.orbitAngle = (this.orbitAngle + deltaTime * (aggressive ? 1.1 : 0.65)) % (Math.PI * 2);
    if (this.tauntCooldown > 0) {
      this.tauntCooldown -= deltaTime;
    }

    let activeShelter = null;
    if (playerInsideShelter && shelters && shelters.length) {
      activeShelter = shelters.find((shelter) => shelter.containsPoint(player.x, player.y));
    }

    if (activeShelter) {
      const radius = Math.max(activeShelter.width, activeShelter.height) / 2 + 26;
      const targetX = activeShelter.x + Math.cos(this.orbitAngle) * radius;
      const targetY = activeShelter.y + Math.sin(this.orbitAngle) * radius;
      this.#moveTowards(targetX, targetY, moveSpeed, deltaTime);
      this.#pushAwayFromShelter(activeShelter);
    } else {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.hypot(dx, dy) || 1;
      const desiredRadius = this.baseRadius + (aggressive ? -6 : 10);

      if (distance > desiredRadius + 20) {
        this.x += (dx / distance) * moveSpeed * deltaTime;
        this.y += (dy / distance) * moveSpeed * deltaTime;
      } else if (distance < desiredRadius - 10) {
        this.x -= (dx / distance) * moveSpeed * 0.8 * deltaTime;
        this.y -= (dy / distance) * moveSpeed * 0.8 * deltaTime;
      } else {
        const orbitRadius = desiredRadius;
        const targetX = player.x + Math.cos(this.orbitAngle) * orbitRadius;
        const targetY = player.y + Math.sin(this.orbitAngle) * orbitRadius;
        this.#moveTowards(targetX, targetY, moveSpeed * 0.9, deltaTime);
      }

      shelters.forEach((shelter) => this.#pushAwayFromShelter(shelter));
    }

    this.eyesPulse += deltaTime;

    if (fracture.coherence < 40 && Math.random() < 0.01) {
      const pool = fracture.coherence < 20 ? this.dialogues?.act2_chase : this.dialogues?.act1_whispers;
      if (pool && pool.length) {
        const phrase = pool[Math.floor(Math.random() * pool.length)];
        this.showDialogue(phrase, 2.5);
        this.tauntCooldown = 3.5;
      }
    }

    if (this.tauntCooldown <= 0 && Math.random() < (playerInsideShelter ? 0.015 : 0.03)) {
      const shortPhrase = this.quickTaunts[Math.floor(Math.random() * this.quickTaunts.length)];
      this.showDialogue(shortPhrase, 2.2);
      this.tauntCooldown = 4 + Math.random() * 3;
    }
  }

  render(renderer) {
    if (!this.visible) return;
    super.render(renderer);
    renderer.drawEyes({
      x: this.x,
      y: this.y,
      intensity: (Math.sin(this.eyesPulse * 5) + 1) / 2,
    });
  }

  receiveAttack() {
    this.showDialogue('No puedes escapar.', 1.5);
  }

  #moveTowards(targetX, targetY, speed, deltaTime) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    this.x += (dx / distance) * speed * deltaTime;
    this.y += (dy / distance) * speed * deltaTime;
  }

  #pushAwayFromShelter(shelter) {
    if (!shelter) return;
    const margin = 18;
    const left = shelter.left() - margin;
    const right = shelter.right() + margin;
    const top = shelter.top() - margin;
    const bottom = shelter.bottom() + margin;

    if (this.x >= left && this.x <= right && this.y >= top && this.y <= bottom) {
      const distances = [
        { axis: 'left', value: this.x - left },
        { axis: 'right', value: right - this.x },
        { axis: 'top', value: this.y - top },
        { axis: 'bottom', value: bottom - this.y },
      ];
      distances.sort((a, b) => a.value - b.value);
      const nearest = distances[0];
      const pushDistance = margin - nearest.value + 2;

      switch (nearest.axis) {
        case 'left':
          this.x = left - 2;
          break;
        case 'right':
          this.x = right + 2;
          break;
        case 'top':
          this.y = top - 2;
          break;
        case 'bottom':
          this.y = bottom + 2;
          break;
        default:
          this.x += Math.cos(this.orbitAngle) * pushDistance;
          this.y += Math.sin(this.orbitAngle) * pushDistance;
      }
    }
  }
}

export class Burocrata extends NPC {
  constructor(config, phrases) {
    super({ ...config, color: '#f8f9fb', name: 'Burocrata', sprite: 'burocrata' });
    this.radius = 24;
    this.angle = Math.random() * Math.PI * 2;
    this.origin = { x: this.x, y: this.y };
    this.phrases = phrases || [];
  }

  update(deltaTime) {
    super.update(deltaTime);
    this.angle += deltaTime * 0.8;
    this.x = this.origin.x + Math.cos(this.angle) * this.radius;
    this.y = this.origin.y + Math.sin(this.angle) * this.radius;

    if (Math.random() < 0.003 && this.phrases.length) {
      const phrase = this.phrases[Math.floor(Math.random() * this.phrases.length)];
      this.showDialogue(phrase, 2);
    }
  }
}

export class MemoryEcho {
  constructor({ x, y, text }) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.timer = 6;
  }

  update(deltaTime, player, renderer) {
    this.timer -= deltaTime;
    const distance = Math.hypot(player.x - this.x, player.y - this.y);
    if (distance < 50 && this.timer > 0) {
      renderer.drawFloatingText({ x: this.x, y: this.y - 18, text: this.text, color: '#d6e4f0' });
      if (Math.random() < 0.01) {
        this.timer = 0;
      }
    }
    return this.timer <= 0;
  }

  scatterAwayFrom(originX, originY) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 160 + Math.random() * 120;
    this.x = originX + Math.cos(angle) * distance;
    this.y = originY + Math.sin(angle) * distance;
    this.timer = Math.max(2, this.timer);
  }
}

export class EnemyEcho {
  constructor({ x, y }) {
    this.x = x;
    this.y = y;
    this.width = 16;
    this.height = 16;
    this.speed = 28;
    this.health = 20;
    this.fade = 1;
    this.isDying = false;
    this.damageCooldown = 0;
    this.state = 'hunt';
    this.scatterTimer = 0;
    this.scatterTarget = { x, y };
    this.awarenessLost = false;
    this.reacquireDistance = 90;
    this.wanderTimer = 0;
    this.wanderDirection = Math.random() * Math.PI * 2;
  }

  update(deltaTime, player, fractureSystem, shelters = [], playerInsideShelter = false) {
    if (this.isDying) {
      this.fade = Math.max(0, this.fade - deltaTime * 2);
      return this.fade <= 0;
    }

    if (this.damageCooldown > 0) {
      this.damageCooldown -= deltaTime;
    }

    const distanceToPlayer = Math.hypot(player.x - this.x, player.y - this.y) || 1;

    if (playerInsideShelter && !this.awarenessLost) {
      this.scatterAwayFrom(player.x, player.y, 1);
    }

    if (!playerInsideShelter && this.awarenessLost && distanceToPlayer <= this.reacquireDistance) {
      this.awarenessLost = false;
      this.state = 'hunt';
    }

    if (this.awarenessLost) {
      if (this.state === 'scatter' && this.scatterTimer > 0) {
        this.scatterTimer -= deltaTime;
        this.#moveTowards(this.scatterTarget.x, this.scatterTarget.y, deltaTime, this.speed * 1.25);
        if (Math.hypot(this.scatterTarget.x - this.x, this.scatterTarget.y - this.y) < 8 || this.scatterTimer <= 0) {
          this.state = 'wander';
        }
      } else {
        this.#wander(deltaTime);
      }

      shelters.forEach((shelter) => {
        if (shelter.keepOutside(this)) {
          this.scatterAwayFrom(shelter.x, shelter.y, 0.6);
        }
      });

      return false;
    }

    if (this.state === 'scatter' && this.scatterTimer > 0) {
      this.scatterTimer -= deltaTime;
      this.#moveTowards(this.scatterTarget.x, this.scatterTarget.y, deltaTime, this.speed * 1.1);
      if (Math.hypot(this.scatterTarget.x - this.x, this.scatterTarget.y - this.y) < 6 || this.scatterTimer <= 0) {
        this.state = 'hunt';
      }
    } else {
      const modifier = playerInsideShelter ? 0.55 : 1;
      this.x += ((player.x - this.x) / distanceToPlayer) * this.speed * modifier * deltaTime;
      this.y += ((player.y - this.y) / distanceToPlayer) * this.speed * modifier * deltaTime;
    }

    shelters.forEach((shelter) => {
      if (shelter.keepOutside(this)) {
        this.scatterAwayFrom(shelter.x, shelter.y, 0.6);
      }
    });

    if (!playerInsideShelter && distanceToPlayer < 18 && this.damageCooldown <= 0) {
      player.takeDamage(10);
      if (fractureSystem) {
        fractureSystem.addStress(12);
      }
      this.damageCooldown = 1.2;
    }
    return false;
  }

  render(renderer) {
    if (this.fade <= 0) return;
    renderer.drawSprite({
      name: 'enemy_echo',
      x: this.x,
      y: this.y,
      opacity: this.fade,
      scale: 1,
    });
  }

  receiveAttack(damage) {
    if (this.isDying) return;
    this.health -= damage;
    if (this.health <= 0) {
      this.isDying = true;
    }
  }

  scatterAwayFrom(originX, originY, durationMultiplier = 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 180 + Math.random() * 140;
    this.scatterTarget = {
      x: originX + Math.cos(angle) * distance,
      y: originY + Math.sin(angle) * distance,
    };
    this.state = 'scatter';
    this.scatterTimer = (4 + Math.random() * 2) * durationMultiplier;
    this.awarenessLost = true;
    this.wanderTimer = 0;
  }

  #moveTowards(targetX, targetY, deltaTime, speed) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    this.x += (dx / distance) * speed * deltaTime;
    this.y += (dy / distance) * speed * deltaTime;
  }

  #wander(deltaTime) {
    this.wanderTimer -= deltaTime;
    if (this.wanderTimer <= 0) {
      this.wanderDirection = Math.random() * Math.PI * 2;
      this.wanderTimer = 1.5 + Math.random() * 2.5;
    }

    const wanderSpeed = this.speed * 0.35;
    this.x += Math.cos(this.wanderDirection) * wanderSpeed * deltaTime;
    this.y += Math.sin(this.wanderDirection) * wanderSpeed * deltaTime;
  }
}

export class ShelterGuardian extends NPC {
  constructor(config, shelter, lines) {
    super({
      ...config,
      speed: 0,
      color: '#8dbce5',
      name: 'Guardián',
      sprite: config?.sprite || null,
    });
    this.shelter = shelter;
    this.lines = lines && lines.length ? lines : [
      'Respira... estás a salvo aquí.',
      'El ruido no cruza estas paredes.',
      'Cuando estés listo, vuelve a mirar afuera.',
    ];
    this.lineCooldown = 0;
    this.__isShelterGuardian = true;
    this.promptCooldown = 0;
    this.promptTimer = 0;
    this.promptVisible = false;
  }

  update(deltaTime, { player }) {
    super.update(deltaTime);
    if (!player || !this.shelter) return;

    if (this.lineCooldown > 0) {
      this.lineCooldown -= deltaTime;
    }
    if (this.promptCooldown > 0) {
      this.promptCooldown -= deltaTime;
    }
    if (this.promptTimer > 0) {
      this.promptTimer -= deltaTime;
      if (this.promptTimer <= 0) {
        this.promptVisible = false;
      }
    }

    const inside = this.shelter.containsPoint(player.x, player.y);
    const distance = Math.hypot(player.x - this.x, player.y - this.y);

    if (inside && this.dialogueTimer <= 0 && this.promptCooldown <= 0) {
      this.promptVisible = true;
      this.promptTimer = 3;
      this.promptCooldown = 7 + Math.random() * 4;
      this.lineCooldown = Math.max(this.lineCooldown, 3.5);
      return;
    }

    if (this.dialogueTimer <= 0 && this.lineCooldown <= 0 && inside) {
      const phrase = this.lines[Math.floor(Math.random() * this.lines.length)];
      this.showDialogue(phrase, 4.5);
      this.lineCooldown = 6 + Math.random() * 4;
    }
  }

  render(renderer) {
    super.render(renderer);
    if (this.promptVisible) {
      renderer.drawFloatingText({
        x: this.x,
        y: this.y - 20,
        text: 'E',
        color: '#f8e16c',
      });
    }
  }
}

export { NPC };
