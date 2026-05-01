import sys
import re

path = 'public/tv/app.js'
try:
    with open(path, 'rb') as f:
        content = f.read().decode('utf-8', 'ignore')
    
    # Fix encoding artifacts
    content = content.replace('fÃ¡cil', 'facil')
    content = content.replace('FÃ¡cil', 'Fácil')
    content = content.replace('DifÃ­cil', 'Difícil')
    content = content.replace('difÃ­cil', 'dificil')
    content = content.replace('ðŸ¦ ', '🦁')
    content = content.replace('ðŸ  ', '🐍')
    content = content.replace('ðŸ¦…', '🦅')
    content = content.replace('ðŸ¦¡', '🦡')

    # Normalize objects to avoid syntax errors and duplicates
    content = content.replace('facil: "Fácil",\n  facil: "Fácil",', 'facil: "Fácil",')
    content = content.replace('dificil: "Difícil",\n  dificil: "Difícil",', 'dificil: "Difícil",')
    content = content.replace('facil: "easy",\n  facil: "easy",', 'facil: "easy",')
    content = content.replace('dificil: "hard",\n  dificil: "hard",', 'dificil: "hard",')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Reparación completa.")
except Exception as e:
    print(f"Error: {e}")
