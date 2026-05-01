import sys

path = 'public/tv/app.js'
with open(path, 'rb') as f:
    raw = f.read()

lines = raw.split(b'\n')
for i, line in enumerate(lines):
    line_num = i + 1
    for char_pos, byte in enumerate(line):
        if byte > 127:
            # Found non-ASCII
            context = line[max(0, char_pos-10):min(len(line), char_pos+10)]
            print(f"Line {line_num}, Pos {char_pos}: Byte {byte} (Hex {hex(byte)}) - Context: {context}")
            # Just show the first few per line
            if char_pos > 200: break 
    if line_num > 200: break # Only check first 200 lines
