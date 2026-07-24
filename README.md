# Nexo

Nexo es un sistema operativo personal que conecta dinero, tiempo y bienestar.

## Estado

La primera base incluye:

- aplicación móvil en Flutter;
- dashboard web separado del backend;
- API Node independiente desplegable en Render;
- persistencia PostgreSQL para capturas y finanzas;
- agenda de eventos persistente;
- autenticación con ChatGPT y datos aislados por usuario;
- API para consultar, crear y eliminar capturas;
- pantalla principal "Hoy";
- captura rápida persistente en web y temporal en móvil;
- módulos dedicados de finanzas y eventos;
- captura general para notas, apuestas, comidas, salud y gimnasio;
- espacio de progreso para futuras relaciones entre módulos.

La autenticación web está implementada. La aplicación móvil todavía funciona
como prototipo en memoria y no está sincronizada con el backend.

## Ejecutar

```bash
cd apps/mobile
flutter run
```

## Verificar

```bash
cd apps/mobile
flutter analyze
flutter test
```

### Web

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

### Backend

```bash
cd backend/api
cp .env.example .env
npm install
npm run build
npm run db:migrate
npm run dev
```

La infraestructura de Render está declarada en `render.yaml`.
