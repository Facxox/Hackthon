import { LaNina, ElCritico, Burocrata } from './npcs.js';
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
      this.#prepareAnchors();
      return;
    }

    const prompt = this.#buildPrompt(template);

    try {
      // Intento de delegar la expansion del template a un endpoint externo (Claude/GPT).
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        const raw = await response.text();
        const parsed = this.#parseStoryResponse(raw);
        if (parsed) {
          this.story = parsed;
        } else {
          this.story = this.#fillTemplate(template);
        }
      } else {
        this.story = this.#fillTemplate(template);
      }
    } catch (error) {
      console.warn('Fallo generando historia dinamica, usando plantilla local.', error);
      this.story = this.#presets()[Math.floor(Math.random() * 3)];
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
      { x: 0, y: -60 },
      { x: 90, y: -40 },
      { x: -100, y: 120 },
    ];

    const nina = new LaNina({ x: basePositions[0].x, y: basePositions[0].y });
    const critico = new ElCritico({ x: basePositions[1].x, y: basePositions[1].y }, npcs.elCritico.dialogues);
    const buro = new Burocrata({ x: basePositions[2].x, y: basePositions[2].y }, npcs.losBurocratas.variable.phrases);

    game.registerNPC(nina);
    game.registerNPC(critico);
    game.registerNPC(buro);
  }

  spawnAnclas(game) {
    this.anchors.forEach((anchor) => game.registerAnchor(anchor));
  }

  #prepareAnchors() {
    const actsPositions = [
      { x: -80, y: -20 },
      { x: 140, y: 40 },
      { x: -160, y: 180 },
    ];
    this.anchors = this.story.anclas.map((data, index) => new Anchor({
      ...data,
      position: actsPositions[index] || { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 },
    }));
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
