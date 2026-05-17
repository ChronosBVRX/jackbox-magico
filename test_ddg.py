try:
    from duckduckgo_search import DDGS
    print("DDGS importado exitosamente.")
    results = DDGS().images("AI generated Hagrid hut Hogwarts magical fantasy art", max_results=1)
    print(results)
except Exception as e:
    print(f"Error: {e}")
