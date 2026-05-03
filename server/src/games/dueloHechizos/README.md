# Duelo de Hechizos - Lógica V2

## Dinámica
Duelo estratégico tipo Piedra-Papel-Tijera-Lagartija-Spock pero con 5 hechizos mágicos. Si hay empate, se resuelve con un choque de varitas (tapping rápido).

## Hechizos y Ventajas
1. **Expelliarmus** vence a Rictusempra.
2. **Protego** vence a Expelliarmus.
3. **Stupefy** vence a Protego.
4. **Esquivar** vence a Stupefy.
5. **Rictusempra** vence a Esquivar.

## Fases
1. **Selección**: Duelistas eligen hechizo en secreto (7s).
2. **Choque (Opcional)**: Si eligen el mismo hechizo, deben presionar el móvil lo más rápido posible (5s).
3. **Resultados**: Revelación de hechizos y ganador.

## Reglas de Puntuación (V1)
- **Victoria**: 150 pts.
- **Rapidez**: 30 pts.
- **Victoria en Choque**: 80 pts.
- **Timeout**: -30 pts.

## Eventos Socket.IO
- `game:state`: Indica quiénes son los duelistas actuales.
- `player:action` (spell): Selección de hechizo.
- `player:action` (tap): Incrementa contador de choque.
