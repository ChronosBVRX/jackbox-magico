import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Jackbox Mágico Render App")


allowed_origins = [
    "https://jackbox-magico.onrender.com",
    "https://jackbox-magico.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
]

render_external_url = os.environ.get("RENDER_EXTERNAL_URL")
if render_external_url:
    allowed_origins.append(render_external_url.rstrip("/"))


app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def include_app_router(label: str, import_fn):
    try:
        imported_app_or_router = import_fn()

        if hasattr(imported_app_or_router, "router"):
            app.include_router(imported_app_or_router.router)
        else:
            app.include_router(imported_app_or_router)

        print(f"[Render App] {label} cargado correctamente", flush=True)
    except Exception as error:
        print(f"[Render App] ERROR cargando {label}: {repr(error)}", flush=True)
        raise


# ------------------------------------------------------------
# App principal
# ------------------------------------------------------------

include_app_router(
    "api.main",
    lambda: __import__("api.main", fromlist=["app"]).app,
)


# ------------------------------------------------------------
# Rutas separadas que antes manejaba vercel.json
# ------------------------------------------------------------

include_app_router(
    "api.story_api",
    lambda: __import__("api.story_api", fromlist=["router"]).router,
)

include_app_router(
    "api.story_ready_api",
    lambda: __import__("api.story_ready_api", fromlist=["app"]).app,
)

include_app_router(
    "api.story_tv_api",
    lambda: __import__("api.story_tv_api", fromlist=["app"]).app,
)

include_app_router(
    "api.story_prepare_api",
    lambda: __import__("api.story_prepare_api", fromlist=["app"]).app,
)

include_app_router(
    "api.story_bet_api",
    lambda: __import__("api.story_bet_api", fromlist=["app"]).app,
)

include_app_router(
    "api.room_lifecycle_api",
    lambda: __import__("api.room_lifecycle_api", fromlist=["app"]).app,
)

include_app_router(
    "api.caldero_api",
    lambda: __import__("api.caldero_api", fromlist=["app"]).app,
)

include_app_router(
    "api.copa_final_api",
    lambda: __import__("api.copa_final_api", fromlist=["app"]).app,
)


# ------------------------------------------------------------
# Archivos estáticos
# ------------------------------------------------------------

def mount_if_exists(route_path: str, directory: str, name: str):
    if os.path.isdir(directory):
        app.mount(route_path, StaticFiles(directory=directory), name=name)
        print(f"[Render App] Static mount {route_path} -> {directory}", flush=True)
    else:
        print(f"[Render App] Static directory not found: {directory}", flush=True)


mount_if_exists("/assets", "public/assets", "assets")
mount_if_exists("/data", "data", "data")
mount_if_exists("/tv", "public/tv", "tv")
mount_if_exists("/mobile", "public/mobile", "mobile")
mount_if_exists("/", "public", "public")


@app.get("/api/render-health")
async def render_health():
    return {
        "status": "ok",
        "message": "Jackbox Mágico corriendo en Render",
        "render": bool(os.environ.get("RENDER")),
    }
