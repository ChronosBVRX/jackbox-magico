import os

path = 'public/tv/app.js'
with open(path, 'rb') as f:
    raw = f.read()

# Comprehensive list of corrupted sequences found in screenshots and logs
replacements = [
    (b'\xc3\xb0\xc5\xb8\xc2\xa7\xc2\x99\xc3\xa2\xc2\x80\xc2\x8d\xc3\xa2\xc2\x99\xc2\x82\xc3\xaf\xc2\xb8\xc2\x8f', '🧙‍♂️'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\x98\xc2\x8d', '😍'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\x92\xc2\x9c', '💜'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\x94\xc2\x87', '🔊'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\x93\xc2\x96', '📖'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\x9b\xc2\xa8', '🎇'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\x9f\xc2\x86', '✨'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\xa6\xc2\x81', '🦁'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\x90\xc2\x8d', '🐍'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\xa6\xc2\x85', '🦅'.encode('utf-8')),
    (b'\xc3\xb0\xc5\xb8\xc2\xa6\xc2\xa1', '🦡'.encode('utf-8')),
    (b'\xc3\x83\xc2\xad', 'í'.encode('utf-8')),
    (b'\xc3\x83\xc2\xa1', 'á'.encode('utf-8')),
    (b'\xc3\x83\xc2\xb3', 'ó'.encode('utf-8')),
    (b'\xc3\x83\xc2\xba', 'ú'.encode('utf-8')),
    (b'\xc3\x83\xc2\xa9', 'é'.encode('utf-8')),
    (b'\xc3\x83\xc2\xb1', 'ñ'.encode('utf-8')),
    (b'\xc3\x83\xc2\xbf', '¿'.encode('utf-8')),
    (b'\xc3\x82\xc2\xa1', '¡'.encode('utf-8')),
    (b'\xc3\x83\xc2\xbc', 'ü'.encode('utf-8')),
]

for old, new in replacements:
    raw = raw.replace(old, new)

# General cleanup for partial corruptions
raw = raw.replace(b'\xc3\xb0\xc5\xb8', b'\xf0\x9f') # common emoji prefix error

with open(path, 'wb') as f:
    f.write(raw)

print("Limpieza profunda completada.")
