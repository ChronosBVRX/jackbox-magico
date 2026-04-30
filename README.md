# jackbox-magico

## Evitar errores de merge (guía simple)
Si GitHub te muestra bloques como `<<<<<<<`, `=======`, `>>>>>>>`, significa que hay conflicto entre ramas.

### Flujo recomendado (sin programar mucho)
1. Trabaja siempre en **una sola rama** por cambio.
2. Antes de abrir PR, actualiza tu rama con `main`.
3. Ejecuta este chequeo local:

```bash
./tools/check_conflicts.sh
```

4. Si falla, no hagas merge todavía: abre los archivos marcados y elimina los bloques de conflicto.

### Regla práctica
- Si la misma función fue editada en dos ramas, quédate con una sola versión final y elimina duplicados.
- Nunca dejes texto `<<<<<<<`, `=======`, `>>>>>>>` en el archivo final.
