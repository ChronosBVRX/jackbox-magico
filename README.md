# Hogwarts Game Night / Torneo Mágico Interactivo (Versión 1.0 Estable)

Hogwarts Game Night es una experiencia interactiva tipo Jackbox para noches sociales en bar, diseñada para grupos de 4 a 8 jugadores.

Este es el núcleo estable del proyecto, basado en una arquitectura autoritativa en tiempo real con WebSockets y diseñado específicamente para operación comercial y entretenimiento en vivo.

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
