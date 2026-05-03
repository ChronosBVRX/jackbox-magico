# AGENTS.md — Jackbox Mágico

## Proyecto
Jackbox Mágico es una app tipo party game inspirada en Copa de las Casas.
Tiene pantalla TV, celulares como controles, salas, jugadores, minijuegos y modo historia.

## Stack
- Python (FastAPI)
- Vercel (Hosting)
- Supabase (Database)
- JavaScript vanilla
- HTML/CSS estático
- UI TV en `public/tv`
- UI móvil en `public/mobile`
- APIs en `api`

## Reglas generales
- No reescribir todo el proyecto.
- No cambiar la arquitectura si no es necesario.
- No eliminar scripts existentes sin justificarlo.
- No tocar lógica de Supabase salvo que el bug lo requiera.
- No cambiar nombres de rutas públicas sin revisar `vercel.json`.
- No modificar la lógica de minijuegos si la tarea es solo visual o de carga.
- Mantener compatibilidad con Vercel serverless.

## Seguridad
- No ejecutar comandos destructivos.
- No borrar carpetas.
- No limpiar discos, caches globales ni directorios fuera del repo.
- Antes de modificar varios archivos, explicar el plan.
- Antes de tocar archivos sensibles, pedir revisión.

## Pantalla TV
Archivos principales:
- `public/tv/index.html`
- `public/tv/app.js`
- `public/tv/styles.css`
- `public/assets/js/*`

La pantalla TV debe:
- Cargar `/api/story/catalog`.
- Mostrar historias disponibles.
- Crear sala.
- Mostrar QR.
- Administrar lobby.
- Controlar el avance de historia.

## Modo historia
Archivos principales:
- `api/story_orchestrator.py`
- `api/story_api.py`
- `api/story_tv_api.py`

El catálogo de historias vive en `STORY_CATALOG`.
El catálogo de minijuegos vive en `GAME_CATALOG`.

## Estilo UI
La estética debe ser:
- Premium
- Mágica
- Oscura
- Glassmorphism
- Dorado sutil
- Legible en TV
- Moderna, no saturada

## Validación mínima
Después de cambios:
- Revisar consola del navegador.
- Verificar que no haya `Unexpected token '<'`.
- Verificar que `/api/story/catalog` devuelva JSON.
- Ejecutar:
  `python -m py_compile api/story_orchestrator.py api/story_api.py api/main.py`

## Prohibido
- No usar `innerHTML` con datos sin escapar, salvo que se use `escapeHTML`.
- No introducir HTML suelto dentro de archivos JS.
- No duplicar funciones existentes si se pueden mejorar.
- No cambiar el flujo host TV / celular sin instrucción explícita.
