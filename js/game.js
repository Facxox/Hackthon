import { Player } from './player.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { ChunkManager } from './mapGenerator.js';
import { FractureSystem } from './fracture.js';
import { CombatSystem } from './combat.js';
import { EnemyEcho, MemoryEcho, ShelterGuardian } from './npcs.js';
import { MazeMinigame } from './maze.js';
import { Shelter } from './shelters.js';

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
    mazeOverlay,
    mazeCanvas,
    mazeCounter,
    noteOverlay,
    noteTitle,
    noteBody,
    noteCloseButton,
    noteContinueButton,
  }) {
    this.canvas = canvas;
    this.dialogueBox = dialogueBox;
    this.hpFill = hpFill;
    this.flashOverlay = flashOverlay;
    this.fractureOverlay = fractureOverlay;
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
    this.shelters = [];
    this.shelterNpcs = [];
    this.visibleChunks = [];
  this.playerInsideShelter = false;
  this.mazeActive = false;
  this.currentShelter = null;
  this.activeGuardian = null;
  this.mazeCompletions = 0;
  this.currentMazeLevel = 0;
  this.mazeCounterElement = mazeCounter || null;
    this.noteOverlay = noteOverlay || null;
    this.noteTitleElement = noteTitle || null;
    this.noteBodyElement = noteBody || null;
    this.noteCloseButton = noteCloseButton || null;
    this.noteContinueButton = noteContinueButton || null;
    this.isNoteVisible = false;
    this.noteLockActive = false;
  this.lastNoteIndexShown = -1;
    this.mazeNotes = [
      {
        title: 'Bitácora I: La Llamada',
        body: 'Encontré la nota arrugada que dejaste en la cocina. Decías que volverías antes de que oscureciera, que solo ibas al trabajo a "apagar un último incendio". Clara probó el teléfono toda la tarde, pero tu línea sonó ocupada hasta que el humo ya era otra cosa. No estabas aquí cuando prometiste que estaría segura.',
      },
      {
        title: 'Bitácora II: La Puerta',
        body: 'Los bomberos dijeron que la puerta estaba trabada por dentro. Clara raspó la madera con las uñas; aún las veo en el marco chamuscado. Le dijiste que esperara quieta, que no abriera por nada. Ella obedeció, papá. Creyó que tu voz iba a llegar antes que el fuego. No entiendo por qué tardaste tanto.',
      },
      {
        title: 'Bitácora III: La Verdad',
        body: 'El parte policial menciona el bar de la avenida. Dijeron que peleaste con el jefe, que te negaste a salir porque "no volverías a ese infierno". Mientras discutías bajo la lluvia, Clara gritaba tu nombre detrás de las cortinas ardiendo. Ella no murió por el incendio. Murió esperando que cumplieras tu promesa.',
      },
    ];

    this.lastTime = null;
    this.dialogueTimer = 0;
    this.enemySpawnTimer = 3;
    this.flashTimer = 0;
    this.assetsLoaded = false;

    this.boundLoop = this.loop.bind(this);

    this.maze = mazeOverlay && mazeCanvas
      ? new MazeMinigame({
        overlayElement: mazeOverlay,
        canvasElement: mazeCanvas,
        onComplete: (success) => this.#onMazeResolved(success),
      })
      : null;
    this.totalMazeLevels = this.maze?.getLevelCount?.() || 0;

    if (this.maze && this.totalMazeLevels > 0) {
      this.maze.setProgress(this.mazeCompletions, this.totalMazeLevels);
    }
    this.#updateMazeCounter();

    if (this.noteCloseButton) {
      this.noteCloseButton.addEventListener('click', () => this.#dismissMazeNote());
    }
    if (this.noteContinueButton) {
      this.noteContinueButton.addEventListener('click', () => this.#dismissMazeNote());
    }

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
    this.#refreshShelters();
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
    if (this.maze && this.maze.isActive) {
      this.maze.update(deltaTime);
      this.updateUi(deltaTime);
      return;
    }

    if (this.isNoteVisible) {
      this.updateUi(deltaTime);
      return;
    }

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
  this.updateShelters(deltaTime);
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

    this.shelters.forEach((shelter) => shelter.render(this.renderer));
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
    if ((this.maze && this.maze.isActive) || this.isNoteVisible) {
      return;
    }

    const guardian = this.#findActiveGuardian();
    if (guardian) {
      if (this.maze && !this.mazeActive) {
        this.#openMazeChallenge(guardian);
      } else {
        guardian.showDialogue('Podemos intentarlo cuando quieras.', 3.6);
      }
      return;
    }

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

    let spawnPosition = { x: spawnPoint.x, y: spawnPoint.y };
    const blockingShelter = this.shelters.find((shelter) => shelter.containsPoint(spawnPosition.x, spawnPosition.y));
    if (blockingShelter) {
      spawnPosition = blockingShelter.randomPerimeterPoint();
    }

    this.enemies.push(new EnemyEcho(spawnPosition));
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
        shelters: this.shelters,
        playerInsideShelter: this.playerInsideShelter,
      });
    });
  }

  updateShelters(deltaTime) {
    if (this.shelters.length === 0) {
      this.playerInsideShelter = false;
      this.currentShelter = null;
      this.activeGuardian = null;
      return;
    }

    let playerEntered = false;

    this.shelters.forEach((shelter) => {
      const event = shelter.update(deltaTime, this.player);
      if (event === 'enter') {
        playerEntered = true;
      }

      this.enemies.forEach((enemy) => {
        if (shelter.keepOutside(enemy) && typeof enemy.scatterAwayFrom === 'function') {
          enemy.scatterAwayFrom(this.player.x, this.player.y);
        }
      });

      this.memoryEchoes.forEach((echo) => {
        if (shelter.containsPoint(echo.x, echo.y) && typeof echo.scatterAwayFrom === 'function') {
          echo.scatterAwayFrom(this.player.x, this.player.y);
        }
      });
    });

    if (playerEntered) {
      this.scatterHostiles();
    }

    this.currentShelter = this.shelters.find((shelter) => shelter.playerInside) || null;
    this.playerInsideShelter = Boolean(this.currentShelter);

    if (!this.playerInsideShelter) {
      this.activeGuardian = null;
      if (this.maze && this.maze.isActive) {
        this.maze.close(false);
      }
    }
  }

  updateEnemies(deltaTime) {
    this.enemies = this.enemies.filter((enemy) => !enemy.update(
      deltaTime,
      this.player,
      this.fracture,
      this.shelters,
      this.playerInsideShelter,
    ));
  }

  updateEchoes(deltaTime) {
    this.memoryEchoes = this.memoryEchoes.filter((echo) => {
      const expired = echo.update(deltaTime, this.player, this.renderer);
      if (!expired) {
        this.shelters.forEach((shelter) => {
          if (shelter.containsPoint(echo.x, echo.y) && typeof echo.scatterAwayFrom === 'function') {
            echo.scatterAwayFrom(this.player.x, this.player.y);
          }
        });
      }
      return !expired;
    });
  }

  scatterHostiles() {
    this.enemies.forEach((enemy) => {
      if (typeof enemy.scatterAwayFrom === 'function') {
        enemy.scatterAwayFrom(this.player.x, this.player.y);
      }
    });

    this.memoryEchoes.forEach((echo) => {
      if (typeof echo.scatterAwayFrom === 'function') {
        echo.scatterAwayFrom(this.player.x, this.player.y);
      }
    });
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
    if (this.maze && this.maze.isActive) {
      this.activeGuardian = null;
      this.maze.close(false);
    }

    this.mazeActive = false;
    this.activeGuardian = null;
    this.currentShelter = null;
    if (this.input) {
      this.input.setMovementLocked(false);
    }

    this.isNoteVisible = false;
    this.noteLockActive = false;
    this.lastNoteIndexShown = -1;
    if (this.noteOverlay) {
      this.noteOverlay.classList.remove('visible');
    }

    this.mazeCompletions = 0;
    this.currentMazeLevel = 0;
    this.#updateMazeCounter();
    if (this.maze) {
      this.maze.setProgress(this.mazeCompletions, this.totalMazeLevels);
    }

    this.player = new Player(0, 0);
    this.fracture = new FractureSystem();
    this.combat = new CombatSystem();
    this.anchors = [];
    this.npcs = [];
    this.enemies = [];
    this.memoryEchoes = [];
    this.shelters = [];
    this.visibleChunks = [];
    this.dialogueTimer = 0;
    this.enemySpawnTimer = 3;
    this.flashTimer = 0;
    this.playerInsideShelter = false;
    this.shelterNpcs = [];
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
      this.#refreshShelters();
    }
  }

  #findActiveGuardian() {
    if (!this.playerInsideShelter || !this.currentShelter) {
      return null;
    }

    let closest = null;
    let minDistance = Infinity;
    this.shelterNpcs.forEach((guardian) => {
      if (!guardian || guardian.shelter !== this.currentShelter) {
        return;
      }
      const distance = Math.hypot(this.player.x - guardian.x, this.player.y - guardian.y);
      if (distance < 36 && distance < minDistance) {
        minDistance = distance;
        closest = guardian;
      }
    });

    return closest;
  }

  #openMazeChallenge(guardian) {
    if (!this.maze || this.mazeActive) {
      return;
    }

  const totalLevels = this.totalMazeLevels || this.maze.getLevelCount?.() || 0;
  this.totalMazeLevels = totalLevels;
    const levelIndex = totalLevels > 0 ? Math.min(this.mazeCompletions, totalLevels - 1) : 0;
    this.currentMazeLevel = levelIndex;

    this.mazeActive = true;
    this.activeGuardian = guardian || null;
    this.input.setMovementLocked(true);
    if (totalLevels > 0) {
      this.maze.setProgress(this.mazeCompletions, totalLevels);
    }
    this.#updateMazeCounter();
    this.maze.open(levelIndex);

    if (guardian) {
      guardian.showDialogue('Respira conmigo. Sigue la salida.', 4.2);
    }

    if (this.dialogueBox) {
      this.dialogueBox.classList.add('hidden');
    }
  }

  #onMazeResolved(success) {
    this.mazeActive = false;
    this.input.setMovementLocked(false);

    if (success) {
      if (this.mazeCompletions < this.totalMazeLevels) {
        this.mazeCompletions += 1;
      }
      this.fracture.registerInteraction(10);
      if (typeof this.fracture.stabilize === 'function') {
        this.fracture.stabilize(6);
      }
      this.#updateMazeCounter();
      if (this.activeGuardian) {
        if (this.mazeCompletions >= this.totalMazeLevels && this.totalMazeLevels > 0) {
          this.activeGuardian.showDialogue('Ya domaste cada recuerdo. Descansa aquí.', 4);
        } else {
          this.activeGuardian.showDialogue('Bien. El refugio late contigo.', 3.8);
        }
      } else if (this.dialogueBox) {
        this.showDialogue('Siento el refugio calmo.', 3.4);
      }
    } else if (this.activeGuardian) {
      this.activeGuardian.showDialogue('No pasa nada, quedamos aquí contigo.', 3.6);
    }

    if (this.maze) {
      this.maze.setProgress(this.mazeCompletions, this.totalMazeLevels);
    }

    const noteIndex = this.mazeCompletions - 1;
    if (
      success &&
      noteIndex >= 0 &&
      noteIndex < this.mazeNotes.length &&
      noteIndex > this.lastNoteIndexShown
    ) {
      this.#showMazeNote(noteIndex);
    }

    this.activeGuardian = null;
  }

  #showMazeNote(index) {
    if (!this.noteOverlay || !Array.isArray(this.mazeNotes)) {
      return;
    }

    if (!Number.isFinite(index) || index < 0 || index >= this.mazeNotes.length) {
      return;
    }

    const note = this.mazeNotes[index];
    if (!note) {
      return;
    }

    if (this.noteTitleElement) {
      this.noteTitleElement.textContent = note.title || 'Memoria';
    }
    if (this.noteBodyElement) {
      this.noteBodyElement.textContent = note.body || '';
    }

    this.noteOverlay.classList.add('visible');
    this.isNoteVisible = true;
    this.noteLockActive = true;
  this.lastNoteIndexShown = index;
    if (this.input) {
      this.input.setMovementLocked(true);
    }
    if (this.dialogueBox) {
      this.dialogueBox.classList.add('hidden');
    }
  }

  #dismissMazeNote() {
    if (!this.isNoteVisible) {
      return;
    }

    this.isNoteVisible = false;
    this.noteLockActive = false;
    if (this.noteOverlay) {
      this.noteOverlay.classList.remove('visible');
    }
    if (!this.mazeActive && this.input) {
      this.input.setMovementLocked(false);
    }
  }

  #updateMazeCounter() {
    if (!this.mazeCounterElement) {
      return;
    }

    const total = this.totalMazeLevels || 0;
    const current = Math.min(this.mazeCompletions, total);
    this.mazeCounterElement.textContent = `Laberintos completados: ${current}/${total || 0}`;

    if (total > 0 && current >= total) {
      this.mazeCounterElement.classList.add('complete');
    } else {
      this.mazeCounterElement.classList.remove('complete');
    }
  }

  #refreshShelters() {
    const configs = this.#generateShelterConfigs();
    if (!configs.length) {
      this.shelters = [];
      this.playerInsideShelter = false;
      this.#removeShelterGuardians();
      return;
    }
    this.shelters = configs.map((config, index) => new Shelter({
      ...config,
      label: config.label || `Refugio ${index + 1}`,
    }));
    this.playerInsideShelter = false;
    this.#spawnShelterGuardians();
  }

  #generateShelterConfigs() {
    if (!this.anchors.length) {
      return [
        { x: -120, y: -60, width: 84, height: 64, label: 'Refugio 1' },
        { x: 160, y: 80, width: 78, height: 70, label: 'Refugio 2' },
      ];
    }

    const actAnchors = new Map();
    this.anchors.forEach((anchor) => {
      if (!anchor || !anchor.position) return;
      const actKey = Number.isFinite(anchor.act) ? anchor.act : actAnchors.size;
      if (!actAnchors.has(actKey)) {
        actAnchors.set(actKey, anchor);
      }
    });

    const referenceAnchors = Array.from(actAnchors.values()).slice(0, 3);
    if (!referenceAnchors.length) {
      return [];
    }

    return referenceAnchors.map((anchor, index) => {
      const angleOffset = (index % 2 === 0 ? -1 : 1) * (Math.PI / 5);
      const angle = (Math.PI * 0.65 * index) + angleOffset;
      const radius = 100 + index * 45;
      return {
        x: anchor.position.x + Math.cos(angle) * radius,
        y: anchor.position.y + Math.sin(angle) * radius,
        width: 86 - index * 8,
        height: 68 - Math.min(12, index * 4),
        label: `Refugio ${index + 1}`,
      };
    });
  }

  #removeShelterGuardians() {
    if (!this.shelterNpcs.length) return;
    const guardianSet = new Set(this.shelterNpcs);
    this.npcs = this.npcs.filter((npc) => !guardianSet.has(npc));
    this.shelterNpcs = [];
  }

  #spawnShelterGuardians() {
    this.#removeShelterGuardians();
    if (!this.shelters.length) return;

    this.shelters.forEach((shelter, index) => {
      const guardian = new ShelterGuardian({
        x: shelter.x,
        y: shelter.y + shelter.height / 4,
        sprite: 'burocrata',
        name: `Guardián ${index + 1}`,
      }, shelter, [
        'Respira... estás a salvo aquí.',
        'Afuera solo hay ruido, espera tu ritmo.',
        'Cuando estés listo, podemos seguir.',
      ]);
      this.shelterNpcs.push(guardian);
      this.registerNPC(guardian);
    });
  }
}
