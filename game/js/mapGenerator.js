export class ChunkManager {
  constructor(tileSize = 16) {
    this.chunks = new Map();
    this.chunkSize = 16;
    this.tileSize = tileSize;
    this.seed = Date.now();
  }

  getChunk(chunkX, chunkY) {
    const key = this.#chunkKey(chunkX, chunkY);
    if (!this.chunks.has(key)) {
      const chunk = this.#generateChunk(chunkX, chunkY);
      this.chunks.set(key, chunk);
    }
    return this.chunks.get(key);
  }

  getSurroundingChunks(playerX, playerY) {
    const chunkX = Math.floor(playerX / (this.chunkSize * this.tileSize));
    const chunkY = Math.floor(playerY / (this.chunkSize * this.tileSize));
    const chunks = [];
    for (let x = chunkX - 1; x <= chunkX + 1; x += 1) {
      for (let y = chunkY - 1; y <= chunkY + 1; y += 1) {
        chunks.push(this.getChunk(x, y));
      }
    }
    return chunks;
  }

  clearAll() {
    this.chunks.clear();
  }

  #generateChunk(chunkX, chunkY) {
    const tiles = [];
    const structures = [];
    const spawnPoints = [];
    const random = this.#createRandom(chunkX, chunkY);
    const baseX = chunkX * this.chunkSize * this.tileSize;
    const baseY = chunkY * this.chunkSize * this.tileSize;

    for (let tx = 0; tx < this.chunkSize; tx += 1) {
      for (let ty = 0; ty < this.chunkSize; ty += 1) {
        const worldX = baseX + tx * this.tileSize;
        const worldY = baseY + ty * this.tileSize;
        const noise = random();
        const color = this.#pickColor(noise);
        tiles.push({ x: worldX, y: worldY, size: this.tileSize, color });

        if (noise > 0.92) {
          structures.push({
            x: worldX,
            y: worldY,
            size: this.tileSize,
            color: 'rgba(22, 27, 47, 0.8)',
          });
        }

        if (noise > 0.85 && noise < 0.9) {
          spawnPoints.push({
            x: worldX + this.tileSize / 2,
            y: worldY + this.tileSize / 2,
          });
        }
      }
    }

    return {
      id: this.#chunkKey(chunkX, chunkY),
      chunkX,
      chunkY,
      tiles,
      structures,
      spawnPoints,
      generatedAt: Date.now(),
      hasAnchor: false,
      hasNpc: false,
    };
  }

  #chunkKey(x, y) {
    return `${x},${y}`;
  }

  #createRandom(chunkX, chunkY) {
    let state = (chunkX * 374761393 + chunkY * 668265263 + this.seed) >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  #pickColor(noise) {
    if (noise > 0.8) return '#1f2430';
    if (noise > 0.6) return '#111521';
    if (noise > 0.4) return '#0c1018';
    return '#080a12';
  }
}
