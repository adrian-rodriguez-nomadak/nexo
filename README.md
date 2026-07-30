# Nexo

Nexo es un asistente personal con memoria conectada. La experiencia principal
es una sola conversación capaz de entender distintos temas de la vida,
relacionar su contexto y convertirlo en acciones.

## Estado

La base actual incluye:

- una aplicación web centrada exclusivamente en el chat;
- registro e inicio de sesión con datos aislados por usuario;
- historial conversacional persistente;
- entrada mediante texto, imágenes y documentos;
- registros contextuales unificados por tema, tipo, fechas, estado y entidades
  relacionadas;
- búsqueda y actualización de pendientes desde la conversación;
- memoria personal con procedencia, confianza, sensibilidad, confirmación y
  deduplicación;
- confirmación obligatoria para escrituras financieras o restringidas;
- API Node y PostgreSQL desplegables de manera independiente;
- rutas heredadas de finanzas, eventos, notas, salud y otros dominios durante la
  transición;
- prototipo móvil en Flutter, todavía sin sincronización completa con el nuevo
  núcleo.

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
