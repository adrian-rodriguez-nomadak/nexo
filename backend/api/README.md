# Nexo API

API independiente de Nexo para desplegar en Render con Node.js y PostgreSQL.

## Desarrollo

1. Crea una base PostgreSQL.
2. Copia `.env.example` como `.env` y ajusta `DATABASE_URL`.
3. Instala, compila y migra:

```bash
npm install
npm run build
npm run db:migrate
npm run dev
```

La API queda disponible en `http://localhost:3001`.

## Render

- Root Directory: `backend/api`
- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm run db:migrate && npm start`
- Health Check Path: `/health`

Variables requeridas:

- `DATABASE_URL`: URL interna de Render PostgreSQL.
- `CORS_ORIGIN`: origen público del frontend; acepta varios separados por coma.
- `DATABASE_SSL`: `false` para la URL interna de Render; usa `true` únicamente
  con una conexión externa que no incluya `sslmode=require`.
- `AUTH_EXCHANGE_SECRET`: secreto compartido con el servidor web para convertir
  una identidad verificada de ChatGPT en una sesión de Nexo. Si no está
  definido, se reutiliza `JWT_SECRET` para facilitar la migración del servicio
  anterior.

## Autenticación

- `POST /api/auth/siwc` intercambia una identidad verificada por una sesión.
- `GET /api/auth/me` consulta el usuario de la sesión.
- `POST /api/auth/logout` revoca la sesión.

Las rutas de capturas y finanzas requieren un token Bearer y filtran todos los
datos por el usuario autenticado.
