# Nexo Web

Dashboard web y API de Nexo construidos sobre Vinext y Cloudflare D1.

## Flujos disponibles

- Consultar capturas con `GET /api/captures`.
- Crear capturas con `POST /api/captures`.
- Eliminar una captura con `DELETE /api/captures/:id`.
- Consultar el estado con `GET /api/health`.
- Consultar balance, cuentas y movimientos con `GET /api/finances`.
- Crear cuentas con `POST /api/finances/accounts`.
- Crear movimientos con `POST /api/finances/transactions`.
- Eliminar movimientos con `DELETE /api/finances/transactions/:id`.

## Finanzas

El primer módulo funcional permite crear cuentas en MXN, registrar ingresos y
gastos, consultar balances por cuenta y revisar el flujo neto consolidado.

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
