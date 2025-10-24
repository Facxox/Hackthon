export class Player {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.width = 16;
    this.height = 16;
    this.speed = 90;
    this.health = 100;
    this.maxHealth = 100;
    this.attackCooldown = 0;
    this.attackInterval = 0.5;
    this.attackWindow = 0.15;
    this.attackTimer = 0;
    this.facing = { x: 0, y: 1 };
  }

  update(deltaTime, input, combatSystem, enemies, fractureSystem) {
    this.#handleMovement(deltaTime, input);
    this.#handleAttack(deltaTime, input, combatSystem, enemies, fractureSystem);
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  isDead() {
    return this.health <= 0;
  }

  #handleMovement(deltaTime, input) {
    const dir = input.getDirection();
    if (dir.x !== 0 || dir.y !== 0) {
      const magnitude = Math.hypot(dir.x, dir.y) || 1;
      const normalizedX = dir.x / magnitude;
      const normalizedY = dir.y / magnitude;
      this.x += normalizedX * this.speed * deltaTime;
      this.y += normalizedY * this.speed * deltaTime;
      this.facing = { x: normalizedX, y: normalizedY };
    }
  }

  #handleAttack(deltaTime, input, combatSystem, enemies, fractureSystem) {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= deltaTime;
    }

    if (input.consumeAttack() && this.attackCooldown <= 0) {
      combatSystem.performAttack(this, enemies);
      this.attackCooldown = this.attackInterval;
      this.attackTimer = this.attackWindow;
      fractureSystem.addStress(5);
    }
  }

  render(renderer) {
    const sprite = {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
      color: this.attackTimer > 0 ? '#f05454' : '#c9d1d9',
    };
    renderer.drawRect(sprite);
  }
}
