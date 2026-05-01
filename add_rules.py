import os
import re

RULES_MAP = {
    "sombrero.py": '        "host": previous_state.get("host"),\n        "rules_text": [\n            "1. Lee la descripción ridícula en la pantalla.",\n            "2. Vota por la persona de la sala que mejor encaje.",\n            "3. Gana puntos quien reciba más votos."\n        ],\n    }',
    "clase_pociones.py": '        "host": previous_state.get("host"),\n        "points": {\n            "perfect": POINTS_PERFECT,\n            "one_error": POINTS_ONE_ERROR,\n            "two_errors": POINTS_TWO_ERRORS,\n            "three_or_more": POINTS_THREE_OR_MORE,\n            "fastest_perfect": POINTS_FASTEST_PERFECT,\n            "house_most_perfect": POINTS_HOUSE_MOST_PERFECT,\n        },\n        "rules_text": [\n            "1. Memoriza la receta que aparece en la TV.",\n            "2. Repítela tocando los ingredientes en tu celular.",\n            "3. Si te equivocas mucho, tu caldero explotará."\n        ],\n    }',
    "hechizo_incompleto.py": '        "sound_cue": random.choice(["mystery_bell", "spell_hit", "dark_pop", "reveal"]),\n        "rules_text": [\n            "1. Completa la frase del hechizo lo más rápido que puedas.",\n            "2. ¡Tienes poco tiempo, presiona rápido la opción correcta!"\n        ],\n    }',
    "atrapa_snitch.py": '        "scored": False,\n        "host": previous_state.get("host"),\n        "rules_text": [\n            "1. Mantente atento a la TV.",\n            "2. Cuando la Snitch brille y escuches el sonido, ¡TOCA tu celular rápido!",\n            "3. El más rápido gana los 150 puntos."\n        ],\n    }',
    "caldero_mentiroso.py": '        "sound_cue": "mystery_bell",\n        "rules_text": [\n            "1. Aparecerá una afirmación en la TV.",\n            "2. Vota Verdadero o Falso.",\n            "3. Si la mayoría acierta, todos ganan. Si no, pierden puntos."\n        ],\n    }',
    "copa_final.py": '        "sound_cue": "reveal",\n        "rules_text": [\n            "1. Esta es la última oportunidad de ganar puntos.",\n            "2. Apuesta cuántos puntos quieres arriesgar de tu casa.",\n            "3. Si aciertas ganas lo apostado, si fallas lo pierdes."\n        ],\n    }',
    "mapa_travieso.py": '        "scored": False,\n        "host": previous_state.get("host"),\n        "rules_text": [\n            "1. Fíjate qué nombre/icono se repite en el mapa.",\n            "2. Selecciónalo en tu celular lo antes posible."\n        ],\n    }',
    "retratos_chismosos.py": '        "sound_cue": "mystery_bell",\n        "rules_text": [\n            "1. Escucha atentamente la línea de diálogo.",\n            "2. Adivina qué personaje de Harry Potter la dijo."\n        ],\n    }',
    "artes_ridiculas.py": '        "sound_cue": "dark_pop",\n        "rules_text": [\n            "1. Aparecerá un objeto muggle ridículo.",\n            "2. Adivina para qué lo usan en el mundo mágico."\n        ],\n    }',
    "patronus_personalizado.py": '        "sound_cue": "reveal",\n        "rules_text": [\n            "1. Responde preguntas raras sobre tu personalidad.",\n            "2. El sistema calculará tu animal patronus absurdo."\n        ],\n    }'
}

directory = "api"
for filename in os.listdir(directory):
    if filename in RULES_MAP:
        filepath = os.path.join(directory, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Simple replacement strategy targeting the end of build_state dictionaries
        if filename == "sombrero.py":
            content = content.replace('        "host": previous_state.get("host"),\n    }', RULES_MAP[filename])
        elif filename == "clase_pociones.py":
            content = content.replace('        "host": previous_state.get("host"),\n        "points": {\n            "perfect": POINTS_PERFECT,\n            "one_error": POINTS_ONE_ERROR,\n            "two_errors": POINTS_TWO_ERRORS,\n            "three_or_more": POINTS_THREE_OR_MORE,\n            "fastest_perfect": POINTS_FASTEST_PERFECT,\n            "house_most_perfect": POINTS_HOUSE_MOST_PERFECT,\n        },\n    }', RULES_MAP[filename])
        elif filename == "hechizo_incompleto.py":
            content = content.replace('        "sound_cue": random.choice(["mystery_bell", "spell_hit", "dark_pop", "reveal"]),\n    }', RULES_MAP[filename])
        elif filename == "atrapa_snitch.py":
            content = content.replace('        "scored": False,\n        "host": previous_state.get("host"),\n    }', RULES_MAP[filename])
        elif filename == "caldero_mentiroso.py":
            content = content.replace('        "sound_cue": "mystery_bell",\n    }', RULES_MAP[filename])
        elif filename == "copa_final.py":
            content = content.replace('        "sound_cue": "reveal",\n    }', RULES_MAP[filename])
        elif filename == "mapa_travieso.py":
            content = content.replace('        "scored": False,\n        "host": previous_state.get("host"),\n    }', RULES_MAP[filename])
        elif filename == "retratos_chismosos.py":
            content = content.replace('        "sound_cue": "mystery_bell",\n    }', RULES_MAP[filename])
        elif filename == "artes_ridiculas.py":
            content = content.replace('        "sound_cue": "dark_pop",\n    }', RULES_MAP[filename])
        elif filename == "patronus_personalizado.py":
            content = content.replace('        "sound_cue": "reveal",\n    }', RULES_MAP[filename])

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filename}")
