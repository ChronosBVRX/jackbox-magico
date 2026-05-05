# Hogwarts Game Night V2 - Agent Rules

Este proyecto es una reconstrucción limpia de Hogwarts Game Night.

Objetivo:
Crear una app tipo Jackbox para TV + celulares, con Socket.IO, servidor autoritativo y minijuegos modulares.

Reglas obligatorias:
1. No modificar ni borrar el repo viejo sin autorización.
2. Trabajar en rama v2-realtime-engine.
3. No usar polling para el estado del juego.
4. No guardar el estado activo de la partida en Supabase en cada segundo.
5. El servidor es la única autoridad para fases, timers, respuestas y puntuaciones.
6. La TV solo muestra y manda acciones de host.
7. Los celulares solo envían acciones de jugador.
8. Todo evento Socket.IO debe estar tipado.
9. Cada minijuego debe cumplir un contrato común.
10. Después de cada fase, crear pruebas mínimas y documentar cómo probar manualmente.

Stack:
- Node.js
- TypeScript
- Express
- Socket.IO
- Supabase JS
- Render

Estructura esperada:
server/
  src/
    index.ts
    socket/
    engine/
    games/
    services/
    types/
public/
  tv/
  mobile/
  assets/

No exponer secretos.
Usar .env.example.
Nunca escribir claves reales en el código.
Nunca borres funciones si no te lo pido yo explícitamente.
