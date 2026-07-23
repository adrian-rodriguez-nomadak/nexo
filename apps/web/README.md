# Nexo Web

Dashboard web y API de Nexo construidos sobre Vinext y Cloudflare D1.

## Flujos disponibles

- Consultar capturas con `GET /api/captures`.
- Crear capturas con `POST /api/captures`.
- Eliminar una captura con `DELETE /api/captures/:id`.
- Consultar el estado con `GET /api/health`.

## Desarrollo

```bash
npm install
npm run dev
```

## Verificación

```bash
npm run build
npm test
```
