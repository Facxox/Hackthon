# Arquitectura de un Colapso

Experiencia narrativa interactiva construida en JavaScript sobre un canvas 2D. El jugador guía a Arturo a través de recuerdos fragmentados, protegidos por refugios y guardianes, mientras enfrenta laberintos de memoria y diálogos que revelan la historia.

## Características principales
- **Exploración libre** en un mapa segmentado por chunks con enemigos espectrales.
- **Refugios interactivos** con guardianes que habilitan minijuegos de laberintos.
- **Minijuego de laberinto progresivo** con tres niveles de dificultad creciente y contador de progreso in-game.
- **Sistema de notas narrativas** que se activa tras cada laberinto completado.
- **Secuencia final** con diálogos sobre el personaje y animación de cierre dramática.

## Requisitos previos
- Node.js 18+
- Navegador moderno con soporte para ES modules

## Instalación
```bash
# Clonar el repositorio
git clone https://github.com/Facxox/Hackthon.git
cd Hackthon

# Instalar dependencias (si existen scripts auxiliares)
npm install
```

## Configuración de variables de entorno
Algunos scripts del repositorio consumen la API de Gemini. Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido (sin comillas angulares) y conserva el archivo fuera de control de versiones:

```bash
GEMINI_API_KEY="AIzaSyAvUaGZq8D9ryA4sr8iROeD3zi-o9QLRbU"
```

> **Importante:** nunca publiques tu clave real en repositorios o documentación. Usa repositorios privados o variables de entorno seguras para compartirla con tu equipo.

## Ejecución
```bash
npm run start   # O el script equivalente definido en package.json
```
El proyecto también puede abrirse como sitio estático usando una extensión de servidor local en VS Code o herramientas como `npx serve`.

## Scripts útiles
- `npm run build`: prepara una versión distribuible (si está configurado).
- `node scripts/generate_story.js`: script auxiliar para generar contenido narrativo; requiere `GEMINI_API_KEY` configurada en `.env`.

## Estructura del proyecto
```
index.html
css/
  style.css
js/
  game.js
  main.js
  ...
assets/
  sprites/
data/
  storyTemplate.json
scripts/
  generate_sprites.py
```

## Desarrollo
1. Abre el directorio en VS Code.
2. Lanza un servidor estático (por ejemplo, Live Server) apuntando a `index.html`.
3. Edita los módulos dentro de `js/` para ampliar la jugabilidad, historia o UI.
4. Usa `npm run lint` / `npm test` si existen tareas configuradas.

## Próximos pasos sugeridos
- Completar documentación inline de los sistemas principales (fracturas, anclas, NPCs).
- Añadir pruebas automatizadas para el minijuego de laberinto.
- Incorporar assets de audio que refuercen la ambientación.

---
Mantén este README actualizado a medida que evolucione el proyecto y evita incluir secretos o datos sensibles en el repositorio público.
