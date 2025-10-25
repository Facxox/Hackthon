const path = require('path');
const fs = require('fs/promises');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (error) {
    res.status(400).json({ error: 'JSON invalido' });
    return;
  }

  if (!payload || !Array.isArray(payload.anclas) || payload.anclas.length === 0) {
    res.status(400).json({ error: 'Historia invalida' });
    return;
  }

  const filePath = path.join(__dirname, '..', 'data', 'generatedStory.json');

  try {
    await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('No se pudo guardar historia en disco:', error);
    res.status(500).json({ error: 'No se pudo guardar historia en disco' });
  }
};
