# Guía de voces y audios para ElevenLabs

Este documento acompaña el catálogo `data/voice_lines.json`, el generador `tools/generate_voice_lines.py` y el helper `src/voice_audio.py`.

## Flujo recomendado

1. Ejecuta el generador para reconstruir el catálogo completo:

```bash
python tools/generate_voice_lines.py
```

2. Abre `data/voice_lines.json`.
3. Genera cada frase en ElevenLabs usando el texto exacto de `text` y la dirección de actuación del personaje.
4. Exporta cada audio en `.mp3`.
5. Nombra cada archivo exactamente igual que el valor `audio_file`.
6. Sube los audios a:

```text
assets/audio/voice_lines/
```

## Uso desde Python

```python
from src.voice_audio import get_random_voice_line, get_voice_line

line = get_random_voice_line("correct")
print(line["text"])
print(line["asset_path"])

specific = get_voice_line("threat.mcgonagall.dementor_quincena")
print(specific["audio_file"])
```

## Eventos disponibles

- `boot`: bienvenida e inicio general.
- `lobby`: sala de espera, QR y jugadores faltantes.
- `rules`: explicación de reglas.
- `round_start`: inicio de ronda.
- `threat`: amenazas ridículas.
- `correct`: respuesta correcta.
- `wrong`: respuesta incorrecta.
- `timeout`: tiempo agotado.
- `fast_bonus`: bonus por rapidez.
- `streak_bonus`: bonus por racha.
- `humor_bonus`: bonus por respuesta falsa graciosa.
- `leaderboard`: marcador.
- `winner`: anuncio de casa ganadora.
- `final`: cierre de partida.
- `system`: errores técnicos o conexión.
- `explanation`: explicación de respuesta.

## Personajes cargados

| voice_key | Personaje | Dirección sugerida |
|---|---|---|
| `dumbledore` | Dumbledore | Anciano sabio, cálido, juguetón, solemne pero pícaro. |
| `sombrero` | Sombrero Seleccionador | Narrador teatral, burlón, misterioso, con humor seco. |
| `harry` | Harry Potter | Joven héroe, cercano, valiente, ligeramente confundido por el caos. |
| `luna` | Luna Lovegood | Soñadora, rara, tranquila, tierna y accidentalmente graciosa. |
| `mcgonagall` | Profesora McGonagall | Profesora estricta, elegante, seca, sarcástica y disciplinada. |

## Voces extra recomendadas

- **Profesor severo de pociones tipo Snape**: ideal para errores, castigos, sarcasmo seco y comentarios incómodos.
- **Guardabosques bonachón tipo Hagrid**: ideal para lobby, ánimo al jugador y amenazas con criaturas.
- **Amigo nervioso tipo Ron**: ideal para pánico, errores y respuestas absurdas.
- **Alumna brillante tipo Hermione**: ideal para tutoriales, reglas y explicaciones claras.
- **Elfo doméstico caótico tipo Dobby**: ideal para bonus de humor, sistema, errores y frases impredecibles.

## Nota importante sobre voces

Usa voces originales o inspiradas en arquetipos mágicos. No recomiendo clonar voces reales de actores sin autorización. Para ElevenLabs, lo más seguro es describir la intención actoral y mantener un estilo paródico propio.

## Validar audios faltantes

Cuando ya subas los `.mp3`, puedes revisar qué falta con:

```bash
python src/voice_audio.py
```

O desde código:

```python
from src.voice_audio import validate_audio_files
print(validate_audio_files())
```
