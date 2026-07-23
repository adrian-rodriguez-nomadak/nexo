# Nexo Web

Dashboard web de Nexo construido sobre Vinext. La API vive de forma
independiente en `backend/api`.

## Finanzas

El primer módulo funcional permite crear cuentas en MXN, registrar ingresos y
gastos, consultar balances por cuenta y revisar el flujo neto consolidado.

## Desarrollo

Configura la URL de la API:

```bash
cp .env.example .env.local
```

Después inicia la interfaz:

```bash
npm install
npm run dev
```

## Verificación

```bash
npm run build
npm test
```
