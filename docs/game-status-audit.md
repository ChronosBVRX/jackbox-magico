# Auditoría de Estado de Juegos - Jackbox Mágico V2

Este documento rastrea el estado de integración y estabilidad de cada minijuego en la versión V2.

| ID | Nombre | Catalog | Factory | TV View | Móvil View | Estado | Notas |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---|
| trivia_magica | Trivia Mágica | ✅ | ✅ | ✅ | ✅ | OK | Estable. |
| artes_ridiculas | Artes Ridículas | ✅ | ✅ | ✅ | ✅ | OK | Comparte lógica con Trivia. |
| atrapa_snitch | Atrapa la Snitch | ✅ | ✅ | ✅ | ✅ | Beta | Requiere probar latencia. |
| duelo_hechizos | Duelo de Hechizos | ✅ | ✅ | ✅ | ✅ | OK | Validado con 2 jugadores. |
| sombrero_burlon | Sombrero Burlón | ✅ | ✅ | ✅ | ✅ | OK | Fix de renderizado aplicado. |
| clase_pociones | Clase de Pociones | ✅ | ✅ | ✅ | ✅ | OK | Secuencias validadas. |
| mapa_travieso | Mapa Travieso | ✅ | ✅ | ✅ | ✅ | Beta | Fix de vistas móviles aplicado. |
| caldero_mentiroso | Caldero Mentiroso | ✅ | ✅ | ✅ | ✅ | Beta | Lógica de acusación estabilizada. |
| retratos_chismosos | Retratos Chismosos | ✅ | ✅ | ✅ | ✅ | OK | Integrado. |
| hechizo_incompleto | Hechizo Incompleto | ✅ | ✅ | ✅ | ✅ | OK | Integrado. |
| patronus_personalizado| Patronus Personalizado| ✅ | ✅ | ✅ | ✅ | Beta | Votación social estabilizada. |
| copa_final | La Copa Final | ✅ | ✅ | ✅ | ✅ | Beta | Sistema de apuestas integrado. |

## Pendientes Críticos
- [ ] **Timer Global**: Actualmente el avance es manual con `tv_next_round`. Se requiere un `TimerManager` centralizado.
- [ ] **Scoreboard Visual**: La TV recibe el estado pero no hay un sidebar persistente de puntos por casa aún.
- [ ] **Audio/Voces**: No se ha migrado el sistema de voces para evitar dependencias de V1.
- [ ] **Vibración**: Implementada en móvil pero requiere pruebas en dispositivos reales.

## Validaciones de Integración
- `npm run build`: ✅ (Verificado)
- `health check`: ✅
- `socket.join(clientId)`: ✅
- `pointEvents` -> `scoreboard_state`: ✅
- `ReferenceError` Sombrero: ✅ (Arreglado)
- `showView` vs `showMobileView`: ✅ (Arreglado)
