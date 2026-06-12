README - Módulo Ventas

Resumen rápido:
- Añadidos endpoints para productos, servicios y ventas en `htmls/javascript/server.js`.
- Frontend: `htmls/ventas.html` + `htmls/javascript/ventas.js` (catálogo y carrito simple).
- Perfil ahora muestra "Mis compras" (sección en `htmls/perfil.html` y `htmls/javascript/perfil.js`).
- Migración sugerida: `db/migrations/ventas.sql`.

Pasos para instalar y probar localmente:

1) Asegúrate de tener MySQL corriendo y copia de seguridad de la BD.
2) Ejecuta migración (si procede):

```powershell
mysql -u TU_USUARIO -p TU_BASE_DE_DATOS < db/migrations/ventas.sql
```

3) Instala dependencias y levanta servidor:

```powershell
npm install
npm start
```

4) Pruebas automáticas (Windows PowerShell):

```powershell
cd tests
.\flow-tests.ps1
```

5) Alternativamente puedes importar `tests/postman_collection.json` en Postman y ejecutar la colección (usa cookie persistence).

Notas:
- `POST /api/ventas` valida precios en servidor y crea entradas en `ventashay`. Si tus tablas usan otros nombres, actualiza `server.js` o pásame el DDL y ajusto las consultas.
- No ejecutes migraciones en producción sin revisar y hacer backups.

Contacto:
- Si quieres, puedo generar un script de migración más conservador (ALTER con comprobaciones) o ejecutar migración si me das acceso (no recomendado).