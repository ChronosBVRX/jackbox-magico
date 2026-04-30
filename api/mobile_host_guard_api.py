from fastapi import FastAPI, HTTPException


app = FastAPI(title="Jackbox Magico Mobile Host Guard API")


@app.post("/api/mobile/host/{room_code}/start_game/{game_id}")
async def mobile_host_start_game_guard(room_code: str, game_id: str):
    raise HTTPException(status_code=403, detail="La TV controla la partida.")


@app.post("/api/mobile/host/{room_code}/start_sombrero_custom")
async def mobile_host_start_sombrero_guard(room_code: str):
    raise HTTPException(status_code=403, detail="La TV controla la partida.")
