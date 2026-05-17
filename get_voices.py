import urllib.request
import json

API_KEY = "794d57f3b8e20873b6c77cf4f9e37b3dff326ebabe8db171f2daa07556881a7d"
url = "https://api.elevenlabs.io/v1/voices"
headers = {
    "xi-api-key": API_KEY
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        voices = data.get("voices", [])
        for v in voices:
            print(f"Name: {v.get('name')} -> Voice ID: {v.get('voice_id')}")
except Exception as e:
    print("Error:", e)
