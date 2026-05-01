import os

path = 'public/tv/app.js'
with open(path, 'rb') as f:
    raw = f.read()

# Fix triple-encoded sequences
# Example: \xc3\x83\xc2\xad -> í (correct is \xc3\xad)
# Example: \xc3\x83\xc2\xa1 -> á (correct is \xc3\xa1)

replacements = [
    (b'\xc3\x83\xc2\xad', 'í'.encode('utf-8')),
    (b'\xc3\x83\xc2\xa1', 'á'.encode('utf-8')),
    (b'\xc3\x83\xc2\xb3', 'ó'.encode('utf-8')),
    (b'\xc3\x83\xc2\xba', 'ú'.encode('utf-8')),
    (b'\xc3\x83\xc2\xa9', 'é'.encode('utf-8')),
    (b'\xc3\x83\xc2\xb1', 'ñ'.encode('utf-8')),
    (b'\xc3\x83\xc2\xbf', '¿'.encode('utf-8')),
    (b'\xc3\x83\xc2\xa1', '¡'.encode('utf-8')),
    # Icons
    (b'\xc3\xb0\xc5\xb8\xc2\xa6\xc2\x81', '🦁'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\x90\xc2\x8d', '🐍'.encode('utf-8')),
    (b'\xf0\x9f\xa6\x85', '🦅'.encode('utf-8')),
    (b'\xf0\x9f\xa6\xa1', '🦡'.encode('utf-8')),
    # Double encoding artifacts
    (b'\xc3\xb0\xc5\xb8\xc2\xa6', '🦁'.encode('utf-8')), # Partial
    (b'\xc3\x83\xc2', b'\xc3'), # general fix for some double encodings
]

for old, new in replacements:
    raw = raw.replace(old, new)

# Also fix the specific SyntaxError line if it still looks weird
raw = raw.replace(b'f\xc3\xa1cil', b'facil')

with open(path, 'wb') as f:
    f.write(raw)

print("Reparación de codificación binaria completada.")
