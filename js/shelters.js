export class Shelter {
  constructor({ x, y, width = 80, height = 80, label = '' }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.label = label;
    this.pulse = Math.random();
    this.playerInside = false;
    this.activeLevel = 0;
  }

  update(deltaTime, player) {
    this.pulse = (this.pulse + deltaTime * 0.5) % 1;
    const inside = this.containsPoint(player.x, player.y);
    let event = null;

    if (inside && !this.playerInside) {
      event = 'enter';
    } else if (!inside && this.playerInside) {
      event = 'exit';
    }

    this.playerInside = inside;
    const targetLevel = inside ? 1 : 0;
    const speed = inside ? 4 : 2;
    this.activeLevel += (targetLevel - this.activeLevel) * Math.min(1, deltaTime * speed);

    return event;
  }

  render(renderer) {
    renderer.drawSanctuary({
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      active: this.playerInside,
      pulse: this.pulse,
      label: this.label,
      intensity: this.activeLevel,
    });
  }

  containsPoint(px, py) {
    return px >= this.left() && px <= this.right() && py >= this.top() && py <= this.bottom();
  }

  keepOutside(entity) {
    if (!this.containsPoint(entity.x, entity.y)) {
      return false;
    }

    const leftDistance = entity.x - this.left();
    const rightDistance = this.right() - entity.x;
    const topDistance = entity.y - this.top();
    const bottomDistance = this.bottom() - entity.y;

    const minDistance = Math.min(leftDistance, rightDistance, topDistance, bottomDistance);

    if (minDistance === leftDistance) {
      entity.x = this.left() - 4;
    } else if (minDistance === rightDistance) {
      entity.x = this.right() + 4;
    } else if (minDistance === topDistance) {
      entity.y = this.top() - 4;
    } else {
      entity.y = this.bottom() + 4;
    }

    return true;
  }

  randomPerimeterPoint() {
    const left = this.left();
    const right = this.right();
    const top = this.top();
    const bottom = this.bottom();
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0:
        return { x: left - 6, y: top + Math.random() * this.height };
      case 1:
        return { x: right + 6, y: top + Math.random() * this.height };
      case 2:
        return { x: left + Math.random() * this.width, y: top - 6 };
      default:
        return { x: left + Math.random() * this.width, y: bottom + 6 };
    }
  }

  left() {
    return this.x - this.width / 2;
  }

  right() {
    return this.x + this.width / 2;
  }

  top() {
    return this.y - this.height / 2;
  }

  bottom() {
    return this.y + this.height / 2;
  }
}
