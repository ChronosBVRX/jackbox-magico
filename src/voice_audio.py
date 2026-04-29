"""
Helper de audio para jackbox-magico.

Uso recomendado:
    from src.voice_audio import get_voice_line, get_random_voice_line

    line = get_random_voice_line("correct")
    print(line["text"])
    print(line["asset_path"])

Coloca los audios generados en:
    assets/audio/voice_lines/

El nombre del archivo debe coincidir exactamente con audio_file.
"""

from __future__ import annotations

import json
import random
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "voice_lines.json"


@lru_cache(maxsize=1)
def load_voice_catalog() -> dict[str, Any]:
    """Carga el catálogo JSON de frases y audios."""
    with CATALOG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_voice_lines(
    event: Optional[str] = None,
    character: Optional[str] = None,
    voice_key: Optional[str] = None,
) -> list[dict[str, Any]]:
    """
    Devuelve frases filtradas por evento, nombre de personaje o voice_key.

    Eventos disponibles:
    boot, lobby, rules, round_start, threat, correct, wrong, timeout,
    fast_bonus, streak_bonus, humor_bonus, leaderboard, winner, final,
    system, explanation.
    """
    catalog = load_voice_catalog()
    voice_lines = catalog.get("voice_lines", [])

    def matches(line: dict[str, Any]) -> bool:
        if event and line.get("event") != event:
            return False
        if character and line.get("character") != character:
            return False
        if voice_key and line.get("voice_key") != voice_key:
            return False
        return True

    return [line for line in voice_lines if matches(line)]


def get_voice_line(line_id: str) -> Optional[dict[str, Any]]:
    """Devuelve una frase exacta por id, por ejemplo: correct.mcgonagall.excelente."""
    catalog = load_voice_catalog()
    for line in catalog.get("voice_lines", []):
        if line.get("id") == line_id:
            return line
    return None


def get_random_voice_line(
    event: str,
    character: Optional[str] = None,
    voice_key: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """Devuelve una frase aleatoria para que el juego no suene repetitivo."""
    candidates = get_voice_lines(event=event, character=character, voice_key=voice_key)
    if not candidates:
        return None
    return random.choice(candidates)


def get_asset_path(line_id: str) -> Optional[str]:
    """Devuelve únicamente la ruta del mp3 asociado a una frase."""
    line = get_voice_line(line_id)
    if not line:
        return None
    return line.get("asset_path")


def validate_audio_files(base_path: str | Path = "assets/audio/voice_lines") -> dict[str, list[str]]:
    """
    Revisa qué audios faltan o sobran en la carpeta de assets.
    Útil después de subir los mp3 exportados de ElevenLabs.
    """
    catalog = load_voice_catalog()
    expected = {line["audio_file"] for line in catalog.get("voice_lines", [])}
    audio_dir = Path(base_path)

    existing = set()
    if audio_dir.exists():
        existing = {path.name for path in audio_dir.glob("*.mp3")}

    return {
        "missing": sorted(expected - existing),
        "extra": sorted(existing - expected),
    }


if __name__ == "__main__":
    catalog = load_voice_catalog()
    print(f"Frases registradas: {len(catalog.get('voice_lines', []))}")
    print("Ejemplo correct:", get_random_voice_line("correct"))
