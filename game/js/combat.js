export class CombatSystem {
  constructor() {
    this.attackRange = 30;
    this.damage = 25;
  }

  performAttack(player, enemies) {
    const origin = { x: player.x, y: player.y };
    enemies.forEach((enemy) => {
      const dx = enemy.x - origin.x;
      const dy = enemy.y - origin.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= this.attackRange) {
        if (typeof enemy.receiveAttack === 'function') {
          enemy.receiveAttack(this.damage);
        }
      }
    });
  }
}
