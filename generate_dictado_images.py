import urllib.request
import urllib.parse
import os
import time

os.makedirs('public/assets/images/dictado', exist_ok=True)

prompts = {
    'dictado_lobby.png': {
        'prompt': 'A premium cinematic background for a video game lobby, a dark mystical library inside a magical castle, floating glowing neon runes, modern sleek interface aesthetics, atmospheric smoke, volumetric lighting, dark obsidian and deep emerald color palette, hyper-detailed, 8k resolution, photorealistic, non-intrusive design, clean space in the center for UI text overlay',
        'width': 1280,
        'height': 720
    },
    'dictado_hat.png': {
        'prompt': 'A high-tech enchanted wizard hat sitting on a stone pedestal, dark fantasy noir style, subtle glowing neon lines running through the leather fabric, floating magical particle effects, glowing sparks, dark moody background with bokeh, professional game art style, Unreal Engine 5 render, cinematic lighting',
        'width': 800,
        'height': 800
    },
    'dictado_mobile.png': {
        'prompt': 'A sleek, dark, minimal mobile phone wallpaper for a premium wizard game, vertical orientation, dark abstract background with very subtle glowing gold and purple magical wisps, clean, textured dark leather or obsidian surface, high contrast, elegant and modern, optimized for a gaming app screen',
        'width': 720,
        'height': 1280
    }
}

print("Descargando lista de proxies elite para generación por IA...")
proxy_url = "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=3000&country=all&ssl=all&anonymity=elite"
try:
    req = urllib.request.Request(proxy_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as res:
        proxies = [p.strip() for p in res.read().decode('utf-8').strip().split('\n') if p.strip()]
except Exception as e:
    print("Error descargando proxies:", e)
    proxies = []

print(f"Obtenidos {len(proxies)} proxies elite. Iniciando generación de imágenes AI para Dictado Mágico...")

for filename, info in prompts.items():
    dest_path = os.path.join('public/assets/images/dictado', filename)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 20000:
        print(f" -> {filename} ya existe ({os.path.getsize(dest_path)} bytes), saltando.")
        continue
    print(f"\nGenerando {filename} con IA...")
    encoded = urllib.parse.quote(info['prompt'])
    url = f"https://image.pollinations.ai/prompt/{encoded}?width={info['width']}&height={info['height']}&nologo=true&model=flux"
    
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
        print(f" -> [ADVERTENCIA] No se pudo generar {filename} en este bucle.")

print("\nGeneración de imágenes por IA completada exitosamente.")
