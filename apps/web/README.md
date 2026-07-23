# Nexo Web

Dashboard web de Nexo construido sobre Vinext. La API vive de forma
independiente en `backend/api`.

La web usa el inicio de sesión administrado por ChatGPT. En el servidor,
intercambia la identidad autenticada por una sesión corta de Nexo; el token
permanece en memoria y no se guarda en el navegador.

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

Para probar el flujo autenticado fuera de Sites, el entorno debe proporcionar
los encabezados de identidad de ChatGPT y `NEXO_AUTH_SHARED_SECRET`.

## Verificación

```bash
npm run build
npm test
```
