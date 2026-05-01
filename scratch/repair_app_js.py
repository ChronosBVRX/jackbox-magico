import sys

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
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Reparación completada con éxito.")
except Exception as e:
    print(f"Error: {e}")
