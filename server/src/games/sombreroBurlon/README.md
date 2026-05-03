# Sombrero Burlón - Lógica V2

## Dinámica
Votación social. El sombrero hace preguntas sobre los jugadores y todos votan quién encaja mejor.

## Fases
1. **Votación**: 3 rondas de preguntas de intensidad creciente.
2. **Revelación**: El sombrero comenta los resultados de forma sarcástica.
3. **Podio Final**: El más votado de la noche es el "Ganador" (o la víctima principal).

## Reglas de Puntuación (V1)
- **Elegido de la ronda**: 60 pts.
- **Por voto recibido**: 10 pts.
- **Cero votos (Discreto)**: 15 pts.
- **Gran Ganador Final**: 100 pts (+60 para su casa).

## Restricciones
- No se puede votar por uno mismo.
- Solo pueden votar jugadores conectados al inicio de la ronda.

## Eventos Socket.IO
- `game:state`: Pregunta actual y lista de candidatos.
- `player:action` (vote): ID del jugador elegido.
