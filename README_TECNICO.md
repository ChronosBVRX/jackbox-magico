# Hogwarts Snacks - Jackbox Mágico

Experiencia de juego multijugador masivo con narrativa y minijuegos, diseñada para eventos en vivo.

## Requisitos
- **Python 3.11+**
- **Supabase** (Base de datos PostgreSQL + JSONB)
- **Vercel** (Hosting recomendado para frontend y serverless backend)

## Estructura del Proyecto
- `api/`: Backend FastAPI.
  - `services/`: Lógica de negocio centralizada (Salas, Jugadores).
  - `routers/`: Minijuegos individuales.
- `public/`: Frontend estático.
  - `tv/`: Interfaz de la pantalla principal.
  - `mobile/`: Interfaz del control de jugador.
  - `assets/`: Recursos compartidos (CSS, JS, Audio).
- `supabase/`: Scripts SQL para la base de datos.

## Configuración Local
1. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
2. Configura las variables de entorno en un archivo `.env`:
   ```text
   SUPABASE_URL=tu_url
   SUPABASE_SERVICE_ROLE_KEY=tu_key
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   uvicorn api.main:app --reload
   ```

## Flujo de Juego
1. **Lobby**: La TV crea una sala y muestra un código QR.
2. **Unión**: Los jugadores escanean el QR, eligen nombre y casa.
3. **Historia**: La TV inicia el Modo Historia. El narrador explica las reglas.
4. **Mini-juego**: Los jugadores responden desde su móvil. Los cronómetros se sincronizan con la TV.
5. **Resultados**: La TV revela quién ganó puntos para su casa.

## Seguridad y Concurrencia
- **Autoridad Única**: Solo la TV (identificada por `tv_token`) puede avanzar la partida.
- **Optimistic Locking**: Se usa `state_version` para evitar que respuestas simultáneas sobrescriban el estado de la sala.
- **Validación de Límites**: Máximo 8 jugadores por sala, 2 por cada casa mágica.
