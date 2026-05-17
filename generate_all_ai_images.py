import urllib.request
import urllib.parse
import os
import time

os.makedirs('public/assets/images/impostor', exist_ok=True)

prompts = {
    'cabanahagrid.png': 'Ilustracion digital magica de la Cabana de Hagrid en Hogwarts de noche con calabazas iluminadas y luz calida en las ventanas estilo arte de videojuego premium',
    'banomyrtle.png': 'Ilustracion fantasmal del bano de Myrtle la Llorona en Hogwarts con lavabos antiguos de piedra y brillo espectral azul estilo arte de videojuego misterioso',
    'oficinasnape.png': 'Ilustracion oscura y magica de la oficina y aula de pociones de Severus Snape en Hogwarts con calderos humeantes verdes y frascos misteriosos estilo videojuego',
    'bosqueprohibido.png': 'Ilustracion del Bosque Prohibido de Hogwarts de noche con arboles gigantes antiguos niebla densa y luz de luna misteriosa estilo arte de videojuego',
    'grancamara.png': 'Ilustracion epica de la Camara de los Secretos en Hogwarts con estatuas de serpientes gigantes de piedra y agua misteriosa en el suelo estilo arte de videojuego premium',
    'salaesteren.png': 'Ilustracion magica de la Sala de los Menesteres en Hogwarts repleta de torres de libros antiguos objetos magicos y muebles apilados estilo arte de videojuego',
    'callejonknockturn.png': 'Ilustracion siniestra y oscura del Callejon Knockturn de noche con tiendas de magia tenebrosa letreros antiguos y niebla verde estilo arte de videojuego',
    'azkaban.png': 'Ilustracion terrorifica de la prision de Azkaban en una fortaleza oscura de piedra sobre el mar en una tormenta con dementores volando estilo arte de videojuego premium'
}

print("Descargando lista de proxies elite para generación por IA...")
proxy_url = "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=3000&country=all&ssl=all&anonymity=elite"
req = urllib.request.Request(proxy_url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as res:
    proxies = [p.strip() for p in res.read().decode('utf-8').strip().split('\n') if p.strip()]

print(f"Obtenidos {len(proxies)} proxies elite. Iniciando generación de imágenes AI específicas en español...")

for filename, prompt in prompts.items():
    dest_path = os.path.join('public/assets/images/impostor', filename)
    print(f"\nGenerando {filename} con IA...")
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=800&height=800&nologo=true&model=flux"
    
    success = False
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as res:
            content = res.read()
            if len(content) > 20000: # Verificar que sea una imagen real generada por IA
                with open(dest_path, 'wb') as f: f.write(content)
                print(f" -> [ÉXITO] Generada directamente ({len(content)} bytes)")
                success = True
    except: pass

    if not success:
        for proxy in proxies:
            print(f" -> Probando proxy {proxy} para {filename}...")
            try:
                proxy_handler = urllib.request.ProxyHandler({'http': f'http://{proxy}', 'https': f'http://{proxy}'})
                opener = urllib.request.build_opener(proxy_handler)
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with opener.open(req, timeout=4) as res:
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
