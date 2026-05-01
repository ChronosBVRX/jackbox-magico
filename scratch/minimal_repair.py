import os

path = 'public/tv/app.js'
with open(path, 'rb') as f:
    raw = f.read()

# Let's try to decode as utf-8 first, then latin-1 if it fails
try:
    content = raw.decode('utf-8')
except:
    content = raw.decode('latin-1')

# Specific fixes for the SyntaxError and Icons
content = content.replace('fÃ¡cil: "FÃ¡cil"', 'facil: "Fácil"')
content = content.replace('facil: "FÃ¡cil"', 'facil: "Fácil"')
content = content.replace('ðŸ¦ ', '🦁')
content = content.replace('ðŸ  ', '🐍')
content = content.replace('ðŸ¦…', '🦅')
content = content.replace('ðŸ¦¡', '🦡')

# Cleanup the duplicated lines if they exist (just in case)
# ... but let's be minimal.

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reparación mínima aplicada.")
