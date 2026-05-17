import urllib.request
import urllib.parse
import os
import time

os.makedirs('public/assets/images/covers', exist_ok=True)

prompts = {
    'trivia_magica.png': 'Ilustracion digital magica de un buho inteligente con un birrete sobre una pila de libros de hechizos antiguos en la biblioteca de Hogwarts luz calida dorada estilo arte de videojuego premium',
    'artes_ridiculas.png': 'Ilustracion comica y magica de un boggart confundido saliendo de un ropero antiguo enfrentando objetos muggles ridicolos como un pato de goma gigante estilo arte de videojuego',
    'atrapa_snitch.png': 'Ilustracion epica de una Snitch Dorada brillante volando a toda velocidad en el campo de Quidditch de Hogwarts al atardecer chispas doradas estilo arte de videojuego premium',
    'duelo_hechizos.png': 'Ilustracion espectacular de un duelo de varitas magicas en una arena de Hogwarts con rayos de luz azul y roja chocando en el centro chispas magicas estilo arte de videojuego',
    'sombrero_burlon.png': 'Ilustracion magica del Sombrero Seleccionador antiguo de Hogwarts con una expresion picara y burlona riendose sobre un taburete de madera luz calida estilo arte de videojuego premium',
    'clase_pociones.py': 'Ilustracion de un caldero magico burbujeando pocion verde brillante en una mazmorra oscura con frascos de cristal flotando y vapor magico estilo arte de videojuego premium', # Corrección de extensión abajo
    'clase_pociones.png': 'Ilustracion de un caldero magico burbujeando pocion verde brillante en una mazmorra oscura con frascos de cristal flotando y vapor magico estilo arte de videojuego premium',
    'mapa_travieso.png': 'Ilustracion magica de un pergamino antiguo desplegado sobre una mesa de madera con huellas doradas brillantes moviendose y tinta magica estilo arte de videojuego premium',
    'caldero_mentiroso.png': 'Ilustracion misteriosa de un caldero de bronce con humo purpura y signos de interrogacion flotantes rodeado de magos susurrando secretos estilo arte de videojuego',
    'retratos_chismosos.png': 'Ilustracion magica de una galeria de cuadros antiguos en Hogwarts donde los personajes de las pinturas se susurran chismes al oido luz de velas estilo arte de videojuego',
    'hechizo_incompleto.png': 'Ilustracion de un pergamino flotante con pluma de escribir magica dorada a punto de completar una runa brillante en un aula de Hogwarts estilo arte de videojuego premium',
    'patronus_personalizado.png': 'Ilustracion epica de un ciervo patronus plateado brillante hecho de luz magica pura repeliendo sombras oscuras en un bosque nocturno estilo arte de videojuego premium',
    'copa_final.png': 'Ilustracion espectacular de la Copa de las Casas de Hogwarts dorada y brillante llena de gemas preciosas sobre un pedestal en el Gran Comedor estilo arte de videojuego',
    'beso_boda_muerte.png': 'Ilustracion magica y comica de tres cartas flotantes del tarot magico mostrando un anillo de bodas unos labios de rubi y una calavera con varita estilo arte de videojuego',
    'el_impostor.png': 'Ilustracion misteriosa de un grupo de magos encapuchados en una sala secreta de Hogwarts donde uno tiene una mascara de mortifago oculta en la sombra estilo arte de videojuego',
    'el_tiburon.png': 'Ilustracion comica y magica de un tiburon con traje de empresario y monóculo evaluando inventos magicos locos sobre una mesa de madera estilo arte de videojuego premium',
    'dictado_magico.png': 'Ilustracion magica de una pluma vuela pluma dorada escribiendo sola a gran velocidad sobre un pergamino flotante con ondas de sonido magico estilo arte de videojuego'
}

# Remover la clave erronea si se metió
if 'clase_pociones.py' in prompts:
    del prompts['clase_pociones.py']

print("Descargando lista de proxies elite para generación por IA...")
proxy_url = "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=3000&country=all&ssl=all&anonymity=elite"
try:
    req = urllib.request.Request(proxy_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as res:
        proxies = [p.strip() for p in res.read().decode('utf-8').strip().split('\n') if p.strip()]
except:
    proxies = []

print(f"Obtenidos {len(proxies)} proxies elite. Iniciando generación de portadas AI para los 16 minijuegos...")

for filename, prompt in prompts.items():
    dest_path = os.path.join('public/assets/images/covers', filename)
    print(f"\nGenerando portada {filename} con IA...")
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=800&height=800&nologo=true&model=flux"
    
    success = False
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as res:
            content = res.read()
            if len(content) > 20000:
                with open(dest_path, 'wb') as f: f.write(content)
                print(f" -> [ÉXITO] Generada directamente ({len(content)} bytes)")
                success = True
    except: pass

    if not success and proxies:
        for proxy in proxies[:15]: # Probar hasta 15 proxies
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
        print(f" -> [ADVERTENCIA] No se pudo generar {filename} en este intento.")

print("\nGeneración de portadas por IA completada exitosamente.")
