# Matriz de Migración Jackbox Mágico V1 -> V2

Esta matriz documenta el estado actual de la migración de la lógica desde el motor FastAPI/Polling (V1) al motor Node.js/Socket.IO (V2).

| ID | Nombre | Dinámica | Fases | Estado V2 | Complejidad |
|----|--------|----------|-------|-----------|-------------|
| `trivia_magica` | Trivia del Mundo Mágico | Quiz / Rapidez | Pregunta -> Resultados | Jugable | Baja |
| `artes_ridiculas` | Defensa Contra las Artes Ridículas | Quiz Humorístico | 3x (Pregunta -> Revelación) -> Resultados | Jugable | Baja |
| `atrapa_snitch` | Atrapa la Snitch | Reflejos / Precisión | Instrucciones -> Juego Activo -> Resultados | Preparado | Media |
| `duelo_hechizos` | Duelo de Hechizos | Estrategia (RPS) + Tapping | Selección -> (Choque) -> Resultados | Preparado | Media |
| `sombrero_burlon` | Sombrero Burlón | Votación Social | 3x (Votación -> Revelación) -> Resultados | Preparado | Media |
| `clase_pociones` | Clase de Pociones | Memoria / Receta | Memorización -> Mezcla -> Resultados | Preparado | Media |
| `mapa_travieso` | El Mapa Travieso | Memoria Visual | Observación -> Respuesta -> Resultados | Preparado | Media |
| `caldero_mentiroso` | El Caldero Mentiroso | Engaño Social | Acción Secreta -> Revelación -> Resultados | Preparado | Alta |
| `retratos_chismosos` | Retratos Chismosos | Quiz Pistas | Pista -> Respuesta -> Resultados | Preparado | Baja |
| `hechizo_incompleto` | Hechizo Incompleto | Completar texto | Pregunta -> Resultados | Preparado | Baja |
| `patronus_personalizado` | Patronus Personalizado | Creativo / Voto | Propuesta -> Votación -> Resultados | Preparado | Media |
| `copa_final` | Copa Final: Pregunta Final | Apuesta / Final | Apuesta -> Pregunta -> Ganador | Preparado | Baja |

## Detalles de Lógica por Juego

### 1. Trivia Mágica
- **Lógica**: Preguntas A/B/C/D. Bonos por rapidez (2.5s) y rachas (3 aciertos).
- **Datos Secretos**: Respuesta correcta.
- **TV**: Pregunta, opciones, timer, contador de respuestas.
- **Móvil**: Botones A/B/C/D.

### 2. Artes Ridículas
- **Lógica**: Similar a Trivia pero con una opción "más graciosa" que da 20 puntos si fallas la correcta. 3 subrondas.
- **Datos Secretos**: Correcta y Más Graciosa.
- **TV**: Amenaza absurda, opciones.
- **Móvil**: Botones A/B/C/D.

### 3. Atrapa la Snitch
- **Lógica**: Cálculo de distancia entre Snitch y Aro. Compensación de lag (80ms).
- **TV**: Arena con Snitch y Aro moviéndose (segmentos de movimiento).
- **Móvil**: Botón "¡ATRAPAR!".

### 4. Duelo de Hechizos
- **Lógica**: RPS con 5 opciones. Tabla de ventajas. Tapping si hay empate.
- **TV**: Duelistas enfrentados, hechizos elegidos (revelación).
- **Móvil**: Selector de 5 hechizos. Pantalla de tapping rápido.

### 5. Sombrero Burlón
- **Lógica**: Votación por otros jugadores. No se permite auto-voto.
- **TV**: Pregunta, votos en tiempo real (nombres o burbujas).
- **Móvil**: Lista de jugadores (excluyéndose a sí mismo).

### 6. Clase de Pociones
- **Lógica**: Secuencia de ingredientes. Modos (Inverso, Humo, Señuelos).
- **TV**: Receta (desaparece).
- **Móvil**: Grid de ingredientes para mezclar en orden.

### 7. Mapa Travieso
- **Lógica**: Ubicación de objetos que desaparecen.
- **TV**: Mapa con marcas.
- **Móvil**: Mapa interactivo o selección de zonas.

### 8. Caldero Mentiroso
- **Lógica**: Estabilidad de poción. Acciones: Meter, Descartar, Acusar.
- **Datos Secretos**: Ingrediente de cada uno, acción elegida.
- **TV**: Log de acciones (sin revelar ingrediente), estabilidad visual.
- **Móvil**: Ver ingrediente secreto, elegir acción, escribir mentira.

### 9. Retratos Chismosos
- **Lógica**: Pistas graduales.
- **TV**: Retrato hablando (texto).
- **Móvil**: Selección de respuesta.

### 10. Hechizo Incompleto
- **Lógica**: Completar el "fill in the blank".
- **TV**: Hechizo con `_____`.
- **Móvil**: Opciones de completado.

### 11. Patronus Personalizado
- **Lógica**: Proponer un animal/objeto y votar.
- **Móvil**: Campo de texto y luego botones de voto.

### 12. Copa Final
- **Lógica**: Apuesta de puntos acumulados.
- **TV**: Tabla de posiciones, pregunta final.
- **Móvil**: Slider/Input de apuesta, luego respuesta.
