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

Fuentes de texto para ElevenLabs:
    - data/voice_lines.json
    - data/voice_lines_extra.json
    - tools/generate_voice_lines.py, dentro de RAW_LINES
"""

from __future__ import annotations

import json
import random
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATHS = [
    ROOT / "data" / "voice_lines.json",
    ROOT / "data" / "voice_lines_extra.json",
]


@lru_cache(maxsize=1)
def load_voice_catalog() -> dict[str, Any]:
    """Carga y combina el catálogo base con líneas extra si existen."""
    combined: dict[str, Any] = {
        "version": "combined",
        "characters": {},
        "voice_lines": [],
    }

    seen_ids: set[str] = set()
    for catalog_path in CATALOG_PATHS:
        if not catalog_path.exists():
            continue
        with catalog_path.open("r", encoding="utf-8") as file:
            catalog = json.load(file)

        combined["characters"].update(catalog.get("characters", {}))
        for line in catalog.get("voice_lines", []):
            line_id = line.get("id")
            if not line_id or line_id in seen_ids:
                continue
            combined["voice_lines"].append(line)
            seen_ids.add(line_id)

    return combined


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
    audio_dir = ROOT / base_path if not Path(base_path).is_absolute() else Path(base_path)

    existing = set()
    if audio_dir.exists():
        existing = {path.name for path in audio_dir.glob("*.mp3")}

    return {
        "missing": sorted(expected - existing),
        "extra": sorted(existing - expected),
    }


def export_elevenlabs_manifest(output_path: str | Path = "data/voice_lines_manifest.md") -> Path:
    """Exporta una tabla Markdown con personaje, archivo y texto para grabar en ElevenLabs."""
    catalog = load_voice_catalog()
    output = ROOT / output_path if not Path(output_path).is_absolute() else Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    rows = [
        "# Manifest de audios para ElevenLabs",
        "",
        "Copia el texto de la columna `text` y exporta cada audio con el nombre exacto de `audio_file`.",
        "",
        "| event | character | audio_file | text |",
        "|---|---|---|---|",
    ]
    for line in catalog.get("voice_lines", []):
        text = line.get("text", "").replace("|", "\\|")
        rows.append(f"| {line.get('event')} | {line.get('character')} | `{line.get('audio_file')}` | {text} |")

    output.write_text("\n".join(rows) + "\n", encoding="utf-8")
    return output


if __name__ == "__main__":
    catalog = load_voice_catalog()
    print(f"Frases registradas: {len(catalog.get('voice_lines', []))}")
    print("Ejemplo correct:", get_random_voice_line("correct"))
    print("Manifest:", export_elevenlabs_manifest())
    print("Validación:", validate_audio_files())
