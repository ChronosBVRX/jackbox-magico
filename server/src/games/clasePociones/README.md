# Clase de Pociones - Lógica V2

## Dinámica
Juego de memoria. La TV muestra una secuencia de ingredientes que el jugador debe repetir en su móvil.

## Modos Especiales
- **Normal**: Repetir tal cual.
- **Inverso**: Repetir del último al primero.
- **Señuelos**: Se añaden ingredientes extra en el móvil que no están en la receta.
- **Humo**: La TV se nubla dificultando ver la receta.
- **Inestable**: El tiempo de mezcla es mucho más corto.

## Reglas de Puntuación (V1)
- **Perfecto**: 150 pts.
- **1 Error**: 80 pts.
- **2 Errores**: 40 pts.
- **Explosión (3+ errores)**: 0 pts.
- **Maestro Pocionero (Más rápido perfecto)**: 50 pts.

## Eventos Socket.IO
- `game:state`: Receta y duración de fases.
- `player:action` (mix): Lista ordenada de ingredientes seleccionados.
