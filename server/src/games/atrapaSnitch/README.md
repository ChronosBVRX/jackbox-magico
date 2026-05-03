# Atrapa la Snitch - Lógica V2

## Dinámica
Juego de precisión y reflejos. Una Snitch se mueve por la pantalla TV siguiendo una trayectoria caótica. Los jugadores deben presionar "ATRAPAR" en su móvil cuando la Snitch entre en el aro de captura (que también puede moverse).

## Fases
1. **Instrucciones**: Muestra el funcionamiento del aro y la Snitch.
2. **Juego Activo**: 20-25 segundos de persecución.
3. **Resultados**: Revela quién fue el mejor buscador y los puntos por precisión.

## Reglas de Puntuación (V1)
- **Legendaria**: 180 pts (Distancia <= 3.8)
- **Perfecta**: 130 pts (Distancia <= 6.0)
- **Gran Captura**: 90 pts (Distancia <= 9.8)
- **Cerca**: 45 pts (Distancia <= 14.8)
- **Fallo**: -20 pts (Distancia > 14.8)
- **Bonus Mejor Buscador**: 80 pts.

## Estructura de Datos
- **Snitch Motion**: Lista de segmentos (t0, t1, x0, y0, x1, y1, easing, wobble).
- **Zone Motion**: Similar a la Snitch pero más lenta.
- **Attempts**: Máximo 5 intentos por jugador.

## Eventos Socket.IO
- `game:state`: Envía los segmentos de movimiento a la TV para que el renderizado sea fluido y sincronizado.
- `player:action` (catch): Envía el timestamp del click para calcular la posición exacta en el servidor.
