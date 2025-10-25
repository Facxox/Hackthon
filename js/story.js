import { LaNina, ElCritico } from './npcs.js';
import { Anchor } from './anclas.js';

const FALLBACK_WORLD_EFFECTS = {
  act1: {
    coherence: '80-100',
    atmosphere: 'Ciudad lluviosa, arquitectura opresiva',
    distortions: 'Minimas',
  },
  act2: {
    coherence: '30-60',
    atmosphere: 'Surrealista, gravedad inestable',
    distortions: 'Maximas',
  },
  act3: {
    coherence: '0-30',
    atmosphere: 'Un solo lugar en loop',
    location: 'cocina',
  },
};

const FALLBACK_NPCS = {
  laNina: {
    fixed: {
      role: 'Guia silenciosa',
      appearance: 'Vestido amarillo, no habla',
      behavior: 'Aparece/desaparece, rie o llora',
    },
    variable: {
      physicalDetails: 'Cabello negro lacio, ojos gris plata',
      laughType: 'Risa aguda que termina en llanto',
    },
    dialogues: {
      act1: 'Se sienta en una esquina mojada y mira al vacio.',
      act3: 'Abraza a Arturo en la cocina antes de desaparecer.',
    },
  },
  elCritico: {
    fixed: {
      role: 'Antagonista - la culpa',
      appearance: 'Sombra parecida a Arturo',
      voice: 'Voz de Arturo distorsionada',
      cannotBeKilled: true,
    },
    variable: {
      tone: 'sarcastico',
    },
    dialogues: {
      act1_whispers: ['Aun hueles a gas, Arturo.', 'Tu la dejaste sola. Recuerdas?'],
      act2_chase: ['Apagaste la estufa, seguro? !Mira sus manos!', 'No corriste lo suficiente, ella ardio llorando.'],
      act3_final: 'Reconocelo ya: no la escuchaste cuando grito tu nombre.',
    },
  },
  losBurocratas: {
    fixed: {
      role: 'Medicos del mundo real',
      appearance: 'Sin rostro, batas blancas',
      behavior: 'Intentan calmar a Arturo',
    },
    variable: {
      phrases: [
        'El sujeto muestra resistencia',
        'Incrementar goteo, responde con ira al estimulo.',
        'Registra desorientacion, no reconoce el presente.',
      ],
    },
  },
};

export class StoryManager {
  constructor() {
    this.story = null;
    this.anchors = [];
  }

  async generateStory() {
    let template;
    try {
      template = await this.loadTemplate();
    } catch (error) {
      console.warn('No se pudo cargar plantilla, usando preset local.', error);
      this.story = this.#presets()[0];
      this.#cacheStory(this.story);
      this.#prepareAnchors();
      return;
    }

    const prompt = this.#buildPrompt(template);

    try {
      const generated = await this.#fetchStoryFromGemini(prompt);
      if (generated) {
        this.story = generated;
        this.#cacheStory(this.story);
        console.log('Historia generada por IA:', this.story);
        console.log('Historia generada por IA guardada en localStorage.');
        this.#prepareAnchors();
        return;
      }
    } catch (error) {
      console.warn('Fallo generando historia dinamica con Gemini.', error);
    }

    const storedStory = this.#loadLocalStory();
    if (storedStory) {
      console.info('Usando historia almacenada en localStorage como respaldo.');
      this.story = storedStory;
      this.#prepareAnchors();
      return;
    }

    const cachedStory = await this.#loadCachedStory();
    if (cachedStory) {
      console.info('Usando data/generatedStory.json como respaldo.');
      this.story = cachedStory;
      this.#cacheStory(this.story);
      this.#prepareAnchors();
      return;
    }

    try {
      this.story = this.#fillTemplate(template);
      this.#cacheStory(this.story);
    } catch (error) {
      console.warn('Fallo completando plantilla, usando preset local.', error);
      this.story = this.#presets()[Math.floor(Math.random() * 3)];
      this.#cacheStory(this.story);
    }
    this.#prepareAnchors();
  }

  async loadTemplate() {
    const response = await fetch('data/storyTemplate.json');
    if (!response.ok) throw new Error('No se pudo cargar storyTemplate.json');
    return response.json();
  }

  spawnNPCs(game) {
    if (!this.story) return;
    const { npcs } = this.story;
    const basePositions = [
      { x: -140, y: -110 },
      { x: 90, y: -40 },
      { x: -100, y: 120 },
    ];

    const nina = new LaNina({ x: basePositions[0].x, y: basePositions[0].y });
    const critico = new ElCritico({ x: basePositions[1].x, y: basePositions[1].y }, npcs.elCritico.dialogues);

    game.registerNPC(nina);
    game.registerNPC(critico);
  }

  spawnAnclas(game) {
    this.anchors.forEach((anchor) => game.registerAnchor(anchor));
  }

  async #loadCachedStory() {
    try {
      const response = await fetch('data/generatedStory.json', { cache: 'no-store' });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      if (data && Array.isArray(data.anclas) && data.anclas.length) {
        return data;
      }
    } catch (error) {
      console.info('No se encontro historia local generada.', error);
    }
    return null;
  }

  #loadLocalStory() {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const raw = window.localStorage.getItem('generatedStory');
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.anclas) && parsed.anclas.length) {
        return parsed;
      }
    } catch (error) {
      console.info('No se pudo leer historia almacenada localmente.', error);
    }
    return null;
  }

  #cacheStory(story) {
    if (typeof window === 'undefined' || !story) {
      return;
    }
    try {
      window.localStorage.setItem('generatedStory', JSON.stringify(story));
    } catch (error) {
      console.info('No se pudo guardar historia en localStorage.', error);
    }
  }

  async #fetchStoryFromGemini(prompt) {
    if (typeof window === 'undefined') {
      return null;
    }

  const apiKey = await this.#getGeminiApiKey();
    if (!apiKey) {
      console.warn('No se encontro GEMINI_API_KEY. Define window.GEMINI_API_KEY o localStorage.geminiApiKey.');
      return null;
    }

  const model = this.#getGeminiModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    };

    console.log(`Llamando a Gemini (${model}) directamente desde el cliente...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(`Gemini respondio ${response.status}:`, body);
      return null;
    }

    const data = await response.json();
    const rawText = this.#extractTextFromGemini(data);
    if (!rawText) {
      console.warn('Gemini no devolvio texto legible.');
      return null;
    }

    const parsed = this.#parseStoryResponse(rawText);
    if (!parsed) {
      console.warn('No se pudo parsear la respuesta de Gemini.');
    }
    return parsed;
  }

  async #getGeminiApiKey() {
    if (typeof window === 'undefined') {
      return null;
    }
    const candidates = [
      window.GEMINI_API_KEY,
      window.__GEMINI_API_KEY__,
      window.GEMINI_DEFAULT_API_KEY,
      this.#readGeminiKeyFromMeta(),
      this.#readGeminiKeyFromLocalStorage(),
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'string') {
        return candidate.trim();
      }
    }

    const provided = await this.#askGeminiKeyInteractively();
    if (provided) {
      return provided.trim();
    }

    console.warn('No se encontro GEMINI_API_KEY. Define window.GEMINI_API_KEY, localStorage.geminiApiKey o agrega <meta name="gemini-api-key">.');
    return null;
  }

  #extractTextFromGemini(data) {
    if (!data || !Array.isArray(data.candidates)) {
      return null;
    }
    for (const candidate of data.candidates) {
      const parts = candidate.content?.parts;
      if (!parts) {
        continue;
      }
      for (const part of parts) {
        if (typeof part.text === 'string') {
          return part.text;
        }
      }
    }
    return null;
  }

  #getGeminiModel() {
    if (typeof window === 'undefined') {
      return 'gemini-2.5-flash';
    }

    const sources = [
      window.GEMINI_MODEL,
      window.__GEMINI_MODEL__,
      window.GEMINI_DEFAULT_MODEL,
      this.#readGeminiModelFromLocalStorage(),
    ];

    for (const source of sources) {
      if (source && typeof source === 'string' && source.trim()) {
        return source.trim();
      }
    }

  return 'gemini-2.5-flash';
  }

  #readGeminiModelFromLocalStorage() {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.localStorage.getItem('geminiModel');
    } catch (error) {
      console.info('No se pudo leer geminiModel de localStorage.', error);
      return null;
    }
  }

  #readGeminiKeyFromMeta() {
    if (typeof document === 'undefined') {
      return null;
    }
    const meta = document.querySelector('meta[name="gemini-api-key"]');
    return meta?.content || null;
  }

  #readGeminiKeyFromLocalStorage() {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const stored = window.localStorage.getItem('geminiApiKey');
      return stored || null;
    } catch (error) {
      console.info('No se pudo leer geminiApiKey de localStorage.', error);
      return null;
    }
  }

  async #askGeminiKeyInteractively() {
    if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
      return null;
    }
    const wantsToSet = window.confirm('No hay GEMINI_API_KEY configurada. ¿Quieres introducirla ahora?');
    if (!wantsToSet) {
      return null;
    }
    const key = window.prompt('Introduce tu GEMINI_API_KEY. Se guardara en localStorage para proximas sesiones.');
    if (key && key.trim()) {
      try {
        window.localStorage.setItem('geminiApiKey', key.trim());
      } catch (error) {
        console.info('No se pudo guardar la clave en localStorage.', error);
      }
      return key.trim();
    }
    return null;
  }

  #prepareAnchors() {
    const actsPositions = [
      { x: -80, y: -20 },
      { x: 140, y: 40 },
      { x: -160, y: 180 },
    ];

    const baseAnchors = this.story.anclas.map((data, index) => new Anchor({
      ...data,
      position: actsPositions[index] || this.#randomWorldPosition(index),
    }));

    const desiredTotal = Math.max(6, baseAnchors.length + 3);
    const extraAnchors = [];
    for (let i = baseAnchors.length; i < desiredTotal; i += 1) {
      const source = this.#clone(this.story.anclas[i % this.story.anclas.length]);
      const variable = this.#clone(source.variable || {});
      const newId = `${source.id}_eco_${i}`;
      variable.audioText = `${variable.audioText || '...'} (eco)`;
      extraAnchors.push(new Anchor({
        ...source,
        id: newId,
        act: source.act ?? ((i % 3) + 1),
        position: this.#randomWorldPosition(i + 3),
        variable,
      }));
    }

    this.anchors = [...baseAnchors, ...extraAnchors];
  }

  #randomWorldPosition(seedIndex) {
    const angle = (seedIndex * 137.5) * (Math.PI / 180);
    const radius = 140 + (seedIndex % 6) * 60;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  }

  #fillTemplate(template) {
    const clone = this.#clone(template);
    const names = {
      wife: ['Lucia', 'Marina', 'Isabel', 'Claudia', 'Renata'],
      daughter: ['Sofia', 'Emma', 'Valeria', 'Lia', 'Nora'],
    };
    const causes = ['estufa', 'auto', 'gas', 'incendio electrico'];
    const professions = ['contable', 'ingeniero', 'maestro', 'arquitecto'];
    const laughTypes = ['una risa baja y entrecortada', 'un jadeo que termina en carcajada', 'risas como campanas distantes'];
    const tones = ['sarcastico', 'furioso', 'melancolico'];
    const drawOptions = ['una casa en llamas', 'a mama leyendo', 'un auto rojo roto', 'a los tres tomados de la mano'];
    const memoryMessages = ['Para papa, no vuelvas a dormirme tarde', 'Para papa, cuando volvamos al cine', 'Para papa, te amo incluso cuando gritas'];
    const atmospheres = ['cocina', 'sala principal', 'garaje', 'dormitorio'];

    clone.variable.traumaCause = this.#randomPick(causes);
    clone.variable.profession = this.#randomPick(professions);
    clone.variable.wifeName = this.#randomPick(names.wife);
    clone.variable.daughterName = this.#randomPick(names.daughter);
    clone.variable.daughterAge = String(5 + Math.floor(Math.random() * 4));

    clone.npcs.laNina.variable.physicalDetails = `Cabello ${this.#randomPick(['negro', 'castano', 'ceniza'])}, ojos ${this.#randomPick(['grisaceos', 'azules', 'vacios'])}`;
    clone.npcs.laNina.variable.laughType = this.#randomPick(laughTypes);
    clone.npcs.laNina.dialogues.act1 = 'Aparece cuando Arturo toca la primera ancla y se sienta frente a el en silencio.';
    clone.npcs.laNina.dialogues.act3 = 'En la cocina envuelta en luz roja, la nina abraza a Arturo antes de desvanecerse.';

    clone.npcs.elCritico.variable.tone = this.#randomPick(tones);
    clone.npcs.elCritico.dialogues.act1_whispers[0] = 'Sabes que fue tu culpa, aunque intentes olvidarlo.';
    clone.npcs.elCritico.dialogues.act2_chase[0] = `Otra vez dejaste la ${clone.variable.traumaCause} sin revisar?`;
    clone.npcs.elCritico.dialogues.act2_chase[1] = `Dejaste a ${clone.variable.wifeName} y ${clone.variable.daughterName} esperando en vano.`;
    clone.npcs.elCritico.dialogues.act3_final = 'Mirame bien: soy la parte de ti que nunca perdonara lo que hiciste.';

    clone.npcs.losBurocratas.variable.phrases[1] = 'Aumenta la respuesta autonomica, mantener sedacion.';
    clone.npcs.losBurocratas.variable.phrases[2] = 'Informe: paciente Arturo R. repite el incidente sin aceptar culpa.';

    clone.anclas[0].variable.movieName = this.#randomPick(['El Faro', 'La Casa de las Sombras', 'Cielos Rotos']);
    clone.anclas[0].variable.audioText = `${clone.variable.wifeName}: "Arturo, despierta, la nina tiene frio."`;
    clone.anclas[1].variable.content = `Dibujo de ${this.#randomPick(drawOptions)}.`;
    clone.anclas[1].variable.message = this.#randomPick(memoryMessages);
    clone.anclas[1].variable.audioText = `${clone.variable.daughterName}: "Papa, mira, hice esto para ti."`;
    clone.anclas[2].variable.cause = `Combustion provocada por ${clone.variable.traumaCause} mal apagada.`;
    clone.anclas[2].variable.date = '12/09/2016';

    clone.worldEffects.act3.location = this.#randomPick(atmospheres);

    return clone;
  }

  #randomPick(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  #presets() {
    const cloneNpcs = () => this.#clone(FALLBACK_NPCS);
    const cloneWorld = () => this.#clone(FALLBACK_WORLD_EFFECTS);
    return [
      {
        fixed: {
          premise: 'Arturo atrapado en su mente tras brote psicotico',
          trauma: 'Accidente domestico - murieron esposa e hija',
          objective: 'Reconstruir memorias y aceptar culpa',
        },
        variable: {
          traumaCause: 'estufa',
          profession: 'ingeniero',
          wifeName: 'Marina',
          daughterName: 'Emma',
          daughterAge: '6',
        },
        npcs: cloneNpcs(),
        anclas: [
          {
            id: 'ticket_cine',
            type: 'papel',
            act: 1,
            fixed: { effect: 'Estabiliza mundo 5 segundos' },
            variable: {
              movieName: 'El Faro',
              audioText: 'Marina: "Arturo, no olvides apagar la estufa."',
            },
          },
          {
            id: 'dibujo_infantil',
            type: 'papel',
            act: 2,
            variable: {
              content: 'Una casa con humo negro',
              message: 'Para papa, te espero despierta.',
              audioText: 'Emma: "Papi, prometiste volver temprano."',
            },
          },
          {
            id: 'informe_policial',
            type: 'documento',
            act: 3,
            variable: {
              cause: 'Fuga de gas por hornilla abierta',
              date: '03/11/2015',
            },
          },
        ],
        worldEffects: cloneWorld(),
      },
      {
        fixed: {
          premise: 'Arturo atrapado en su mente tras brote psicotico',
          trauma: 'Accidente domestico - murieron esposa e hija',
          objective: 'Reconstruir memorias y aceptar culpa',
        },
        variable: {
          traumaCause: 'accidente vehicular',
          profession: 'contable',
          wifeName: 'Lucia',
          daughterName: 'Valeria',
          daughterAge: '7',
        },
        npcs: cloneNpcs(),
        anclas: [
          {
            id: 'ticket_cine',
            type: 'papel',
            act: 1,
            fixed: { effect: 'Estabiliza mundo 5 segundos' },
            variable: {
              movieName: 'Cielos Rotos',
        audioText: 'Lucia: "Arturo, la nina esta dormida en el asiento."',
            },
          },
          {
            id: 'dibujo_infantil',
            type: 'papel',
            act: 2,
            variable: {
              content: 'Un auto volcado junto a un arbol.',
              message: 'Para papa, volvamos a casa sin miedo.',
              audioText: 'Valeria: "Por que gritas, papi?"',
            },
          },
          {
            id: 'informe_policial',
            type: 'documento',
            act: 3,
            variable: {
              cause: 'Impacto frontal por quedarse dormido al volante.',
              date: '22/04/2017',
            },
          },
        ],
        worldEffects: cloneWorld(),
      },
      {
        fixed: {
          premise: 'Arturo atrapado en su mente tras brote psicotico',
          trauma: 'Accidente domestico - murieron esposa e hija',
          objective: 'Reconstruir memorias y aceptar culpa',
        },
        variable: {
          traumaCause: 'fuga de gas',
          profession: 'maestro',
          wifeName: 'Irma',
          daughterName: 'Lia',
          daughterAge: '5',
        },
        npcs: cloneNpcs(),
        anclas: [
          {
            id: 'ticket_cine',
            type: 'papel',
            act: 1,
            fixed: { effect: 'Estabiliza mundo 5 segundos' },
            variable: {
              movieName: 'La Casa de las Sombras',
              audioText: 'Irma: "Arturo, cierra la llave de gas antes de dormir."',
            },
          },
          {
            id: 'dibujo_infantil',
            type: 'papel',
            act: 2,
            variable: {
              content: 'Tres figuras con mascaras de gas.',
              message: 'Para papa, prometo respirar despacio.',
              audioText: 'Lia: "Huele raro, verdad papa?"',
            },
          },
          {
            id: 'informe_policial',
            type: 'documento',
            act: 3,
            variable: {
              cause: 'Explosion por acumulacion de gas en cocina cerrada.',
              date: '05/01/2018',
            },
          },
        ],
        worldEffects: cloneWorld(),
      },
    ];
  }

  #clone(obj) {
    if (typeof structuredClone === 'function') {
      return structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
  }

  #buildPrompt(template) {
    // El prompt incluye el template literal para que cualquier servicio LLM responda con JSON.
    const instructions = [
      'Eres escritor de thriller psicologico.',
      'TEMPLATE:',
      JSON.stringify(template, null, 2),
      'Reemplaza todos los [AI: ...] con contenido unico.',
      'REGLAS:',
      '- Dialogos en espanol, 1-2 lineas',
      '- Coherente y emotivo',
      "- Mantener elementos 'fixed' sin cambiar",
      'Devuelve JSON valido.'
    ];
    return instructions.join('\n');
  }

  #parseStoryResponse(raw) {
    // Acepta respuestas en texto y extrae el JSON principal ignorando tokens auxiliares.
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      try {
        const trimmed = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
        if (trimmed) {
          return JSON.parse(trimmed);
        }
      } catch (innerError) {
        console.warn('No se pudo parsear respuesta de IA.', innerError);
      }
    }
    return null;
  }
}
