# Hogwarts Game Night 1.0

Versión estable de producción para operación en bar.

Hogwarts Game Night es una experiencia interactiva tipo Jackbox para grupos de 4 a 8 jugadores, diseñada para noches sociales, cumpleaños, reuniones y dinámicas en vivo.

Incluye:
- TV como pantalla principal.
- Celulares como controles.
- Código de sala.
- Minijuegos sociales, de trivia, acción, memoria y estrategia.
- Modo Torneo Mágico Rotativo.
- Copa Final.
- Experiencias premium como Dictado Mágico, Tiburón y Beso/Boda/Muerte.

Dominio de producción:
https://app.hogwartslzc.com.mx/v2/tv/


## Stack Tecnológico
- **Backend**: Node.js + TypeScript + Express + Socket.IO
- **Frontend**: Vanilla HTML/JS/CSS
- **Despliegue**: Render

## Estructura
- `/server`: Lógica del servidor y motor de juegos.
- `/public/v2`: Cliente de TV y Móvil.

## Instalación Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar entorno:
   ```bash
   cp .env.example .env
   ```

3. Correr en modo desarrollo:
   ```bash
   npm run dev
   ```

4. Abrir en el navegador:
   - TV: `http://localhost:3000/v2/tv/`
   - Móvil: `http://localhost:3000/v2/mobile/`

## Despliegue en Render
El archivo `render.yaml` está preconfigurado. Solo conecta este repositorio a un nuevo Blueprint en Render.

## Reglas de Desarrollo (AGENTS.md)
Consultar `AGENTS.md` para las reglas de arquitectura y contrato de minijuegos.
