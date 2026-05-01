import os

path = 'public/tv/app.js'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Fix avatars
content = content.replace('const avatar = isWitch ? "?T??T??" : "?T??T\'??"', 'const avatar = isWitch ? "🧙‍♀️" : "🧙‍♂️"')
# Just in case it has slightly different ? counts
import re
content = re.sub(r'const avatar = isWitch \? "[^"]+" : "[^"]+"', 'const avatar = isWitch ? "🧙‍♀️" : "🧙‍♂️"', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Avatares corregidos.")
