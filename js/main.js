import { Game } from './game.js';
import { StoryManager } from './story.js';

const canvas = document.getElementById('gameCanvas');
const loadingScreen = document.getElementById('loadingScreen');
const startButton = document.getElementById('startButton');
const dialogueBox = document.getElementById('dialogueBox');
const fractureOverlay = document.getElementById('fractureOverlay');
const hpFill = document.getElementById('hpFill');
const flashOverlay = document.getElementById('flashOverlay');
const gameOverScreen = document.getElementById('gameOverScreen');
const restartButton = document.getElementById('restartButton');
const returnMenuButton = document.getElementById('returnMenuButton');

const game = new Game({
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
});

const storyManager = new StoryManager();

async function bootstrap() {
  try {
    await Promise.all([
      storyManager.generateStory(),
      game.loadAssets(),
    ]);
    game.attachStory(storyManager);
    startButton.disabled = false;
    startButton.removeAttribute('disabled');
    startButton.classList.add('enabled');
  } catch (error) {
    console.error('Error cargando historia', error);
    startButton.disabled = false;
    startButton.removeAttribute('disabled');
    startButton.classList.add('enabled');
  }
}

startButton.addEventListener('click', () => {
  loadingScreen.classList.remove('visible');
  loadingScreen.style.display = 'none';
  startButton.disabled = true;
  startButton.classList.remove('enabled');
  game.start();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.pause();
  } else {
    game.resume();
  }
});

loadingScreen.classList.add('visible');
bootstrap();
