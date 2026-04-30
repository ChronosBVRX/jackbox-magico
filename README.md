# Jackbox Mágico

Party game web inspirado en dinámica tipo Jackbox: la TV funciona como pantalla principal y los celulares como controles de jugador.

## Estructura principal

- `public/tv/`: pantalla principal de TV.
- `public/mobile/`: control móvil de jugadores.
- `public/assets/`: scripts, estilos y recursos servidos como `/assets/...` en Vercel.
- `data/`: catálogos estáticos servidos como `/data/...`.
- `api/`: funciones Python/FastAPI para Vercel.

## Variables de entorno requeridas

Configurar en Vercel:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Sin estas variables, las APIs responderán con `500 Faltan credenciales`.

## Rutas importantes

- TV: `/tv/index.html`
- Móvil: `/mobile/index.html?room=ABCD`
- Salud API: `/api/health`
- Crear sala TV: `/api/host/create_room`
- Unirse a sala: `/api/player/join`

## Notas de despliegue

- El runtime Python está fijado en `runtime.txt`.
- Los imports `from api...` dependen de que `api/` sea paquete Python; por eso existe `api/__init__.py`.
- En Vercel, `/assets/...` se enruta hacia `/public/assets/...` para que los HTML puedan cargar CSS, JS y audio correctamente.

## Recomendación operativa

Para probar una partida:

1. Abrir `/tv/index.html`.
2. Esperar o crear la sala desde la TV.
3. Escanear el QR o entrar desde celular a `/mobile/index.html?room=CODIGO`.
4. Ingresar nombre y casa.

## Pendientes técnicos relevantes

- Separar estado público y privado de los minijuegos.
- Reducir riesgos de concurrencia al guardar respuestas simultáneas.
- Migrar sumas de puntos a operaciones atómicas en Supabase.
- Retirar lógica visual antigua de host móvil si ya no se usará.
- Limitar CORS cuando el dominio final esté definido.
