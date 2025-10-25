#!/usr/bin/env node
/**
 * Genera data/generatedStory.json consultando la API de Gemini desde un script local.
 * Requiere Node 18+ (por fetch nativo) y la variable de entorno GEMINI_API_KEY.
 */
const fs = require('fs/promises');
const path = require('path');

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'data', 'storyTemplate.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'generatedStory.json');

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: define GEMINI_API_KEY en tu entorno antes de ejecutar este script.');
    process.exit(1);
  }

  const template = await loadTemplate();
  const prompt = buildPrompt(template);

  console.log(`Solicitando historia a Gemini (${DEFAULT_MODEL})...`);
  const story = await requestStoryFromGemini(apiKey, prompt);

  if (!story) {
    console.error('No se obtuvo una historia valida. Abortando.');
    process.exit(1);
  }

  console.log('Historia generada por IA:', story);
  await saveStory(story);
  console.log(`Historia guardada en ${OUTPUT_PATH}`);
}

async function loadTemplate() {
  try {
    const raw = await fs.readFile(TEMPLATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('No se pudo leer data/storyTemplate.json', error);
    process.exit(1);
  }
}

function buildPrompt(template) {
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

async function requestStoryFromGemini(apiKey, prompt) {
  const url = `${GEMINI_ENDPOINT}/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Gemini respondio ${response.status}: ${errorBody}`);
      return null;
    }

    const data = await response.json();
    const rawText = extractFirstText(data);
    return parseStory(rawText);
  } catch (error) {
    console.error('Fallo consultando la API de Gemini', error);
    return null;
  }
}

function extractFirstText(data) {
  if (!data || !Array.isArray(data.candidates)) {
    return null;
  }
  for (const candidate of data.candidates) {
    const parts = candidate.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (typeof part.text === 'string') {
        return part.text;
      }
    }
  }
  return null;
}

function parseStory(raw) {
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
      console.warn('No se pudo parsear la respuesta de Gemini.', innerError);
    }
  }
  return null;
}

async function saveStory(story) {
  const json = JSON.stringify(story, null, 2);
  await fs.writeFile(OUTPUT_PATH, json, 'utf8');
}

main().catch((error) => {
  console.error('Error inesperado generando la historia', error);
  process.exit(1);
});
