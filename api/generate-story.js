const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

function extractText(payload) {
  if (!payload || !payload.candidates || !payload.candidates.length) {
    return null;
  }
  const parts = payload.candidates[0]?.content?.parts;
  if (!parts || !parts.length) {
    return null;
  }
  return parts.map((part) => part.text).filter(Boolean).join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY no configurada' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (error) {
    res.status(400).json({ error: 'JSON invalido' });
    return;
  }

  const prompt = body?.prompt;
  if (!prompt) {
    res.status(400).json({ error: 'Falta prompt' });
    return;
  }

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1560,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error:', errorText);
      res.status(502).json({ error: 'Gemini respondio con error', details: errorText });
      return;
    }

    const data = await response.json();
    const text = extractText(data);
    if (!text) {
      res.status(502).json({ error: 'No se pudo obtener texto de Gemini' });
      return;
    }

    res.status(200).send(text.trim());
  } catch (error) {
    console.error('Fallo al contactar Gemini:', error);
    res.status(502).json({ error: 'Fallo al contactar Gemini' });
  }
};
