# Carpeta de Logos

Esta carpeta almacena el logo de tu negocio que se imprime en las facturas.

## Cómo agregar tu logo:

1. Descarga tu logo desde Supabase (o cualquier otra fuente)
2. Guárdalo en esta carpeta con el nombre: `business-logo.png`
3. Reinicia el servidor (`node src/index.js`)

## Requerimientos del logo:

- **Formato:** PNG, JPG, JPEG, GIF
- **Tamaño recomendado:** 400px de ancho máximo
- **Nombre del archivo:** `business-logo.png` (exactamente este nombre)

## Notas:

- El logo se procesa una sola vez al iniciar el servidor
- Si cambias el logo, debes reiniciar el servidor para que se actualice
- Si no existe el archivo, las facturas se imprimen sin logo (no da error)
