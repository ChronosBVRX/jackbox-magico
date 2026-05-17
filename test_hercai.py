import urllib.request
import urllib.parse
import json

url = "https://hercai.onrender.com/v3/text2image?prompt=" + urllib.parse.quote("Hagrid hut at Hogwarts magical fantasy art night")
headers = {'User-Agent': 'Mozilla/5.0'}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        print(f" -> [ÉXITO] Hercai funcionó! Respuesta: {json.dumps(data, indent=2)}")
        img_url = data.get('url')
        if img_url:
            img_req = urllib.request.Request(img_url, headers=headers)
            with urllib.request.urlopen(img_req) as img_res:
                print(f" -> Tamaño de imagen descargada: {len(img_res.read())} bytes")
except Exception as e:
    print(f" -> Error: {e}")
