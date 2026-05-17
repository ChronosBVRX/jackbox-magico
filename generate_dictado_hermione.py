import urllib.request
import urllib.parse
import os
import time

os.makedirs('public/assets/images/dictado', exist_ok=True)

filename = 'dictado_hermione.png'
dest_path = os.path.join('public/assets/images/dictado', filename)

prompt = 'A stunning, premium cinematic portrait of Hermione Granger in the dark mystical Hogwarts library, standing next to floating glowing magical parchment and a vintage enchanted golden microphone, dark fantasy noir style, subtle glowing gold and purple magical wisps, volumetric lighting, Unreal Engine 5 render, professional game art style, 8k resolution, photorealistic'
width = 800
height = 800

print("Descargando lista de proxies elite para generación por IA...")
proxy_url = "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=3000&country=all&ssl=all&anonymity=elite"
try:
    req = urllib.request.Request(proxy_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as res:
        proxies = [p.strip() for p in res.read().decode('utf-8').strip().split('\n') if p.strip()]
except Exception as e:
    print("Error descargando proxies:", e)
    proxies = []

print(f"Obtenidos {len(proxies)} proxies elite. Iniciando generación de imagen de Hermione AI para Dictado Mágico...")

encoded = urllib.parse.quote(prompt)
url = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true&model=flux"

success = False
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as res:
        content = res.read()
        if len(content) > 20000:
            with open(dest_path, 'wb') as f: f.write(content)
            print(f" -> [ÉXITO] Generada directamente ({len(content)} bytes)")
            success = True
except Exception as e:
    print("Fallo directo:", e)

if not success:
    for proxy in proxies:
        print(f" -> Probando proxy {proxy} para {filename}...")
        try:
            proxy_handler = urllib.request.ProxyHandler({'http': f'http://{proxy}', 'https': f'http://{proxy}'})
            opener = urllib.request.build_opener(proxy_handler)
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with opener.open(req, timeout=6) as res:
                content = res.read()
                if len(content) > 20000:
                    with open(dest_path, 'wb') as f: f.write(content)
                    print(f" -> [ÉXITO] Generada con proxy {proxy} ({len(content)} bytes)")
                    success = True
                    break
        except: continue
        
if not success:
    print(f" -> [ADVERTENCIA] No se pudo generar {filename}.")
else:
    print("\nGeneración de imagen de Hermione completada exitosamente.")
