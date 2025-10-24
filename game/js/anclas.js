export class Anchor {
  constructor({ id, type, position, act, fixed = {}, variable = {} }) {
    this.id = id;
    this.type = type;
    this.act = act;
    this.fixed = fixed;
    this.variable = variable;
    this.position = position;
    this.isCollected = false;
    this.fade = 1;
  }

  interact(player, fractureSystem) {
    if (this.isCollected) return null;
    const distance = Math.hypot(player.x - this.position.x, player.y - this.position.y);
    if (distance > 24) return null;

    this.isCollected = true;
    this.fade = 1;
    fractureSystem.stabilize(5);
    fractureSystem.coherence = 100;
    return this.variable.audioText || '...';
  }

  update(deltaTime) {
    if (!this.isCollected) return;
    this.fade = Math.max(0, this.fade - deltaTime * 2);
  }

  render(renderer, player) {
    if (this.isCollected && this.fade <= 0) return;
    const distance = Math.hypot(player.x - this.position.x, player.y - this.position.y);
    const near = distance <= 32;
    renderer.drawAnchor({
      x: this.position.x,
      y: this.position.y,
      glow: near ? 1 : 0,
      visible: !this.isCollected,
      fade: this.fade,
    });
    if (near && !this.isCollected) {
      renderer.drawFloatingText({
        x: this.position.x,
        y: this.position.y - 20,
        text: 'E',
        color: '#f8e16c',
      });
    }
  }
}
