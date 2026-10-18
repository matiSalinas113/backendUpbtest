# backendUpbtest

API de productos con Express y PostgreSQL.

[![Validar API](https://github.com/matiSalinas113/backendUpbtest/actions/workflows/deploy.yml/badge.svg)](https://github.com/matiSalinas113/backendUpbtest/actions/workflows/deploy.yml)

## Ejecutar localmente

1. Instala dependencias con `npm install`.
2. Copia `.env.example` a `.env` y configura `DATABASE_URL` con la URL real. Desde tu PC usa la URL externa de Render y `DB_SSL=true`.
3. Ejecuta `npm run db:init` y `npm start`.

En PowerShell, si bloquea `npm.ps1`, usa `npm.cmd` en lugar de `npm`.

## Probar en Postman

Importa `backendUpb.postman_collection.json`. Configura la variable de coleccion `baseUrl` como `http://localhost:3000` para pruebas locales o con la URL de tu servicio en Render.

Selecciona **Informacion de la API** y envia `GET {{baseUrl}}/api/info`, sin body ni autenticacion. Devuelve HTTP 200:

```json
{ "nombre": "backendupb", "version": "1.0.0", "mensaje": "API funcionando correctamente" }
```

En **Actions > Validar API y desplegar en Render**, el paso **Probar endpoint HTTP para Postman** inicia el servidor y hace una peticion real. Su respuesta aparece en el resumen y en el artefacto `respuesta-endpoint-info`. Las pruebas se ejecutan con pushes y pull requests a `main` y `dev`; el despliegue se solicita solo desde `main`.

Envia `GET {{baseUrl}}/api/health`. Con PostgreSQL y la tabla productos disponibles devuelve HTTP 200:

```json
{ "status": "ok", "database": "connected" }
```

Si la base deja de estar disponible devuelve HTTP 503:

```json
{ "status": "error", "database": "unavailable" }
```

`GET {{baseUrl}}/api/productos` devuelve la lista de productos; `[]` es una respuesta valida si no hay registros.

## GitHub Actions y Render

El workflow `.github/workflows/deploy.yml` se ejecuta en pushes y pull requests a `main` y `dev`, y permite ejecucion manual desde Actions. Usa PostgreSQL temporal, crea la tabla y ejecuta `npm test`. No usa las credenciales de produccion para las pruebas.

Para activar el despliegue despues de las pruebas:

1. En tu servicio web de Render, copia el Deploy Hook de Settings.
2. En GitHub abre Settings > Secrets and variables > Actions > New repository secret.
3. Crea `RENDER_DEPLOY_HOOK_URL` con el hook completo como valor.
4. Configura `DATABASE_URL` y `DB_SSL=true` en las variables del servicio web de Render. La tabla debe estar inicializada en esa base.

En la pestana Actions puedes revisar por separado las pruebas y la solicitud de despliegue. Si falta el secret, el job de despliegue falla con una indicacion en su resumen. La aceptacion del hook confirma la solicitud; el resultado final del despliegue se revisa en Render. Tras finalizar, prueba `/api/health` con la URL publica en Postman.

No subas `.env` ni el Deploy Hook al repositorio.

## Integración con el frontend y demostración

El frontend está en [upbtest2](https://github.com/matiSalinas113/upbtest2) y se publica en Firebase Hosting. Los productos se guardan en PostgreSQL a través de esta API. La app utiliza `NEXT_PUBLIC_API_URL` para elegir el backend; la URL pública configurada por defecto es `https://backendupbtest.onrender.com`.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/info` | Nombre, versión y mensaje de la API |
| GET | `/api/health` | 200 con base conectada, 503 si no está disponible |
| GET | `/api/productos` | Lista de productos |
| GET | `/api/productos?nombre=texto` | Coincidencia parcial literal, sin distinguir mayúsculas |
| GET | `/api/productos/:id` | Detalle o 404 |
| POST | `/api/productos` | Crea y devuelve el producto con 201 |
| PUT | `/api/productos/:id` | Actualiza los campos enviados, conserva los restantes |
| DELETE | `/api/productos/:id` | Elimina y devuelve 204 sin body |

Los productos contienen `id`, `nombre`, `precio`, `stock` y `createdAt`. Las validaciones devuelven 400 con `{ "error": "mensaje" }`. CORS permite las llamadas del frontend alojado en Firebase, incluidas las solicitudes OPTIONS para JSON, PUT y DELETE.

`npm test` verifica información, salud, listado, CRUD completo, búsqueda, validaciones, CORS y el caso de base no disponible. La prueba CRUD elimina su registro temporal incluso si falla una aserción. En GitHub Actions se utiliza una base PostgreSQL temporal separada de producción.
