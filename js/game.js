import { Player } from './player.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { ChunkManager } from './mapGenerator.js';
import { FractureSystem } from './fracture.js';
import { CombatSystem } from './combat.js';
import { EnemyEcho, MemoryEcho } from './npcs.js';

export class Game {
  constructor({
    canvas,
    dialogueBox,
    fractureOverlay,
    hpFill,
    flashOverlay,
    gameOverScreen,
    restartButton,
    returnMenuButton,
    loadingScreen,
    startButton,
  }) {
    this.canvas = canvas;
    this.dialogueBox = dialogueBox;
    this.hpFill = hpFill;
    this.flashOverlay = flashOverlay;
    this.gameOverScreen = gameOverScreen;
    this.restartButton = restartButton;
    this.returnMenuButton = returnMenuButton;
    this.loadingScreen = loadingScreen;
    this.startButton = startButton;
    this.renderer = new Renderer(canvas, fractureOverlay);
    this.input = new InputHandler();
    this.player = new Player(0, 0);
    this.chunkManager = new ChunkManager();
    this.fracture = new FractureSystem();
    this.combat = new CombatSystem();
    this.storyManager = null;

    this.state = 'MENU';
    this.npcs = [];
    this.anchors = [];
    this.enemies = [];
    this.memoryEchoes = [];
    this.visibleChunks = [];

    this.lastTime = null;
    this.dialogueTimer = 0;
    this.enemySpawnTimer = 3;
    this.flashTimer = 0;
    this.assetsLoaded = false;

    this.boundLoop = this.loop.bind(this);

    if (this.restartButton) {
      this.restartButton.addEventListener('click', () => {
        if (this.state === 'GAME_OVER') {
          this.restart();
        }
      });
    }

    if (this.returnMenuButton) {
      this.returnMenuButton.addEventListener('click', () => {
        if (this.state === 'GAME_OVER') {
          this.returnToMenu();
        }
      });
    }
  }

  async loadAssets() {
    if (this.assetsLoaded) return;
    await this.renderer.loadAssets();
    this.assetsLoaded = true;
  }

  attachStory(storyManager) {
    this.storyManager = storyManager;
    this.storyManager.spawnAnclas(this);
    this.storyManager.spawnNPCs(this);
  }

  registerNPC(npc) {
    this.npcs.push(npc);
  }

  registerAnchor(anchor) {
    this.anchors.push(anchor);
  }

  start() {
    if (this.state === 'PLAYING') return;
    if (this.state === 'GAME_OVER') return;
    this.hideGameOver();
    if (this.state === 'MENU') {
      this.resetWorld();
    }
    if (this.loadingScreen) {
      this.loadingScreen.classList.remove('visible');
      this.loadingScreen.style.display = 'none';
    }
    this.state = 'PLAYING';
    this.lastTime = performance.now();
    requestAnimationFrame(this.boundLoop);
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.lastTime = performance.now();
    requestAnimationFrame(this.boundLoop);
  }

  loop(timestamp) {
    if (this.state !== 'PLAYING') return;
    const deltaTime = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(deltaTime);
    if (this.state !== 'PLAYING') {
      return;
    }
    this.render();

    requestAnimationFrame(this.boundLoop);
  }

  update(deltaTime) {
    this.fracture.update(deltaTime);
    this.handleSpawning(deltaTime);

    this.player.update(deltaTime, this.input, this.combat, this.enemies, this.fracture);
    const stressDamage = this.fracture.consumePendingHealthDamage();
    if (stressDamage > 0) {
      this.player.takeDamage(Math.max(1, Math.round(stressDamage)));
      this.flashTimer = Math.max(this.flashTimer, 0.35);
    }
    const stressMessages = this.fracture.consumePendingMessages();
    if (stressMessages.length > 0) {
      this.showDialogue(stressMessages[stressMessages.length - 1], 2.4);
    }
    if (this.player.isDead()) {
      this.updateUi(deltaTime);
      this.triggerGameOver();
      return;
    }
    this.renderer.setCamera({ x: this.player.x, y: this.player.y });

    if (this.input.consumeInteraction()) {
      this.handleInteraction();
    }

    this.updateAnchors(deltaTime);
    this.updateNPCs(deltaTime);
    this.updateEnemies(deltaTime);
    this.updateEchoes(deltaTime);
    this.updateUi(deltaTime);

    this.visibleChunks = this.chunkManager.getSurroundingChunks(this.player.x, this.player.y);
    this.fracture.applyEffects(this.renderer);
  }

  render() {
    this.renderer.beginFrame();

    this.visibleChunks.forEach((chunk) => {
      chunk.tiles.forEach((tile) => this.renderer.drawTile(tile));
      chunk.structures.forEach((structure) => this.renderer.drawRect({
        x: structure.x,
        y: structure.y,
        width: structure.size,
        height: structure.size,
        color: structure.color,
      }));
    });

    this.anchors.forEach((anchor) => anchor.render(this.renderer, this.player));
    this.npcs.forEach((npc) => npc.render(this.renderer));
    this.memoryEchoes.forEach((echo) => this.renderer.drawSprite({
      name: 'enemy_echo',
      x: echo.x,
      y: echo.y,
      scale: 0.75,
      opacity: 0.6,
    }));
    this.enemies.forEach((enemy) => enemy.render(this.renderer));
    this.player.render(this.renderer);

    if (this.flashOverlay) {
      if (this.flashTimer > 0) {
        const alpha = Math.min(1, this.flashTimer / 0.5);
        this.flashOverlay.style.opacity = alpha.toFixed(2);
      } else {
        this.flashOverlay.style.opacity = '0';
      }
    }

    this.renderer.endFrame();
  }

  handleInteraction() {
    let closest = null;
    let minDistance = Infinity;
    this.anchors.forEach((anchor) => {
      if (anchor.isCollected) return;
      const distance = Math.hypot(this.player.x - anchor.position.x, this.player.y - anchor.position.y);
      if (distance < minDistance) {
        minDistance = distance;
        closest = anchor;
      }
    });

    if (closest && minDistance <= 28) {
      this.fracture.registerInteraction(8);
      const audioText = closest.interact(this.player, this.fracture);
      if (audioText) {
        this.showDialogue(audioText, 4.5);
        this.flashTimer = 0.5;
      }
    }
  }

  handleSpawning(deltaTime) {
    this.enemySpawnTimer -= deltaTime;
    if (this.enemySpawnTimer <= 0 && this.enemies.length < 5) {
      this.spawnEnemy();
      this.enemySpawnTimer = 4 + Math.random() * 3;
    }

    if (Math.random() < 0.002) {
      this.spawnMemoryEcho();
    }
  }

  spawnEnemy() {
    const chunkSizePx = this.chunkManager.chunkSize * this.chunkManager.tileSize;
    const playerChunkX = Math.floor(this.player.x / chunkSizePx);
    const playerChunkY = Math.floor(this.player.y / chunkSizePx);
    const candidateChunks = [
      this.chunkManager.getChunk(playerChunkX + 1, playerChunkY),
      this.chunkManager.getChunk(playerChunkX - 1, playerChunkY),
      this.chunkManager.getChunk(playerChunkX, playerChunkY + 1),
      this.chunkManager.getChunk(playerChunkX, playerChunkY - 1),
    ];
    const validChunks = candidateChunks.filter(Boolean);
    if (validChunks.length === 0) return;
    const chunk = validChunks[Math.floor(Math.random() * validChunks.length)];
    const spawnPoint = chunk.spawnPoints[Math.floor(Math.random() * chunk.spawnPoints.length)];
    if (!spawnPoint) return;
    this.enemies.push(new EnemyEcho(spawnPoint));
  }

  spawnMemoryEcho() {
    const dialoguePool = [
      'Pense que volverias pronto...',
      'Los platos siguen en la mesa, Arturo.',
      'Por que la casa arde en mis suenos?',
    ];
    const offsetX = (Math.random() - 0.5) * 220;
    const offsetY = (Math.random() - 0.5) * 220;
    this.memoryEchoes.push(new MemoryEcho({
      x: this.player.x + offsetX,
      y: this.player.y + offsetY,
      text: dialoguePool[Math.floor(Math.random() * dialoguePool.length)],
    }));
  }

  updateAnchors(deltaTime) {
    this.anchors.forEach((anchor) => anchor.update(deltaTime));
  }

  updateNPCs(deltaTime) {
    this.npcs.forEach((npc) => {
      npc.update(deltaTime, {
        player: this.player,
        fracture: this.fracture,
        anchors: this.anchors,
      });
    });
  }

  updateEnemies(deltaTime) {
    this.enemies = this.enemies.filter((enemy) => !enemy.update(deltaTime, this.player, this.fracture));
  }

  updateEchoes(deltaTime) {
    this.memoryEchoes = this.memoryEchoes.filter((echo) => !echo.update(deltaTime, this.player, this.renderer));
  }

  updateUi(deltaTime) {
    const hpPercent = (this.player.health / this.player.maxHealth) * 100;
    this.hpFill.style.width = `${hpPercent}%`;

    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= deltaTime;
      if (this.dialogueTimer <= 0) {
        this.dialogueBox.classList.add('hidden');
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0 && this.flashOverlay) {
        this.flashOverlay.style.opacity = '0';
      }
    }
  }

  showDialogue(text, duration = 2) {
    this.dialogueBox.textContent = text;
    this.dialogueBox.classList.remove('hidden');
    this.dialogueTimer = duration;
  }

  triggerGameOver() {
    if (this.state === 'GAME_OVER') return;
    this.state = 'GAME_OVER';
    if (this.dialogueBox) {
      this.dialogueBox.classList.add('hidden');
    }
    if (this.gameOverScreen) {
      this.gameOverScreen.classList.remove('hidden');
    }
    if (this.flashOverlay) {
      this.flashOverlay.style.opacity = '0';
    }
    if (this.startButton) {
      this.startButton.disabled = true;
      this.startButton.classList.remove('enabled');
    }
  }

  hideGameOver() {
    if (this.gameOverScreen) {
      this.gameOverScreen.classList.add('hidden');
    }
  }

  restart() {
    if (this.state !== 'GAME_OVER') return;
    this.hideGameOver();
    this.resetWorld();
    if (this.loadingScreen) {
      this.loadingScreen.classList.remove('visible');
      this.loadingScreen.style.display = 'none';
    }
    if (this.startButton) {
      this.startButton.disabled = true;
      this.startButton.classList.remove('enabled');
    }
    this.state = 'PLAYING';
    this.lastTime = performance.now();
    requestAnimationFrame(this.boundLoop);
  }

  returnToMenu() {
    if (this.state !== 'GAME_OVER') return;
    this.hideGameOver();
    this.state = 'MENU';
    this.lastTime = null;
    if (this.loadingScreen) {
      this.loadingScreen.classList.add('visible');
      this.loadingScreen.style.display = 'flex';
    }
    if (this.startButton) {
      this.startButton.disabled = false;
      this.startButton.removeAttribute('disabled');
      this.startButton.classList.add('enabled');
    }
  }

  resetWorld() {
    this.player = new Player(0, 0);
    this.fracture = new FractureSystem();
    this.combat = new CombatSystem();
    this.anchors = [];
    this.npcs = [];
    this.enemies = [];
    this.memoryEchoes = [];
    this.visibleChunks = [];
    this.dialogueTimer = 0;
    this.enemySpawnTimer = 3;
    this.flashTimer = 0;
    this.chunkManager.clearAll();
    if (this.dialogueBox) {
      this.dialogueBox.classList.add('hidden');
    }
    if (this.hpFill) {
      this.hpFill.style.width = '100%';
    }
    if (this.flashOverlay) {
      this.flashOverlay.style.opacity = '0';
    }
    if (this.fractureOverlay) {
      this.fractureOverlay.style.opacity = '0';
      this.fractureOverlay.style.filter = 'none';
    }
    this.renderer.setCamera({ x: 0, y: 0 });
    this.renderer.setFractureEffects({
      shakeIntensity: 0,
      overlayIntensity: 0,
      blur: 0,
      chromaticOffset: 0,
    });

    if (this.storyManager) {
      this.storyManager.anchors.forEach((anchor) => {
        anchor.isCollected = false;
        anchor.fade = 1;
      });
      this.storyManager.spawnAnclas(this);
      this.storyManager.spawnNPCs(this);
    }
  }
}
