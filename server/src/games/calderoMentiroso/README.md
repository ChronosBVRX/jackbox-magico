# El Caldero Mentiroso - Lógica V2

## Dinámica
Estrategia y engaño social. Los jugadores intentan salvar o sabotear una poción colectiva usando ingredientes secretos.

## Ingredientes y Efectos
- **Bueno**: +1 estabilidad. (Parece noble, problemas menores).
- **Malo**: -1 estabilidad. (Huele a pasillo prohibido).
- **Explosivo**: -3 estabilidad. (Quiere hacer escándalo).
- **Dorado**: +2 estabilidad. (Brilla como Mundial de Quidditch).

## Acciones
1. **Meter**: Añadir el ingrediente al caldero.
2. **Descartar**: Tirar el ingrediente sin que nadie sepa qué era.
3. **Acusar**: Señalar a alguien de haber metido un ingrediente "Malo" o "Explosivo".

## Reglas de Puntuación (V1)
- **Supervivencia**: Puntos por ingredientes "Buenos/Dorados" si la poción NO explota.
- **Sabotaje**: Puntos por ingredientes "Malos/Explosivos" si la poción EXPLOTA y no te descubren.
- **Acusación Correcta**: 90 pts (Explosivo), 40 pts (Malo).
- **Acusación Incorrecta**: -30 pts.
- **Descartar Explosivo**: 60 pts (Acción heroica secreta).

## Eventos Socket.IO
- `game:player_state`: Envía el ingrediente secreto solo al jugador.
- `player:action`: Envía {action, target, claim}. La "claim" es el mensaje de mentira/verdad que se ve en la TV.
