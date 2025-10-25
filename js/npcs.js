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

  showDialogue(text, duration = 2) {
    this.dialogue = text;
    this.dialogueTimer = duration;
  }
}

export class LaNina extends NPC {
  constructor(config) {
    super({ ...config, color: '#fbee7b', name: 'La Nina', sprite: 'la_nina' });
    this.reappearTimer = 0;
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

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 28) {
      this.showDialogue('je je', 1.2);
      this.visible = false;
      this.reappearTimer = 6;
    } else if (distance < 140) {
      this.x += (dx / distance) * this.speed * deltaTime * 0.6;
      this.y += (dy / distance) * this.speed * deltaTime * 0.6;
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
  }

  update(deltaTime, { player, fracture }) {
    super.update(deltaTime);
    if (!player) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;

    const targetSpeed = fracture.coherence < 40 ? this.speed * 1.5 : this.speed * 0.8;
    this.x += (dx / distance) * targetSpeed * deltaTime;
    this.y += (dy / distance) * targetSpeed * deltaTime;

    this.eyesPulse += deltaTime;

    if (fracture.coherence < 40 && Math.random() < 0.01) {
      const pool = fracture.coherence < 20 ? this.dialogues?.act2_chase : this.dialogues?.act1_whispers;
      if (pool && pool.length) {
        const phrase = pool[Math.floor(Math.random() * pool.length)];
        this.showDialogue(phrase, 2.5);
      }
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
  }

  update(deltaTime, player, fractureSystem, shelters = [], playerInsideShelter = false) {
    if (this.isDying) {
      this.fade = Math.max(0, this.fade - deltaTime * 2);
      return this.fade <= 0;
    }

    if (this.damageCooldown > 0) {
      this.damageCooldown -= deltaTime;
    }

    if (this.state === 'scatter' && this.scatterTimer > 0) {
      this.scatterTimer -= deltaTime;
      this.#moveTowards(this.scatterTarget.x, this.scatterTarget.y, deltaTime, this.speed * 1.25);
      if (Math.hypot(this.scatterTarget.x - this.x, this.scatterTarget.y - this.y) < 8 || this.scatterTimer <= 0) {
        this.state = 'hunt';
      }
    } else {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.hypot(dx, dy) || 1;
      const modifier = playerInsideShelter ? 0.55 : 1;
      this.x += (dx / distance) * this.speed * modifier * deltaTime;
      this.y += (dy / distance) * this.speed * modifier * deltaTime;
    }

    shelters.forEach((shelter) => {
      if (shelter.keepOutside(this)) {
        this.scatterAwayFrom(shelter.x, shelter.y, 0.6);
      }
    });

    if (!playerInsideShelter) {
      const distanceToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
      if (distanceToPlayer < 18 && this.damageCooldown <= 0) {
        player.takeDamage(10);
        if (fractureSystem) {
          fractureSystem.addStress(12);
        }
        this.damageCooldown = 1.2;
      }
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
  }

  #moveTowards(targetX, targetY, deltaTime, speed) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    this.x += (dx / distance) * speed * deltaTime;
    this.y += (dy / distance) * speed * deltaTime;
  }
}

export { NPC };
