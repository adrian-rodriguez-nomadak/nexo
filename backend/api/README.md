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

Para ejecutar el seeder que vacía conversaciones, memorias y registros de
producto, pero conserva usuarios, credenciales, sesiones y migraciones:

```bash
npm run build
npm run db:seed:clean -- --yes
```

El comando requiere `--yes` para evitar borrados accidentales. El comando
anterior `db:reset-data` se mantiene como alias compatible.

La API queda disponible en `http://localhost:3001`.

## Render

- Root Directory: `backend/api`
- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm run db:migrate && npm start`
- Health Check Path: `/health`

Variables requeridas:

- `DATABASE_URL`: URL interna de Render PostgreSQL.
- `CORS_ORIGIN`: orígenes adicionales permitidos; acepta varios separados por
  coma. La web oficial en Vercel y el desarrollo local ya están incluidos.
- `DATABASE_SSL`: `false` para la URL interna de Render; usa `true` únicamente
  con una conexión externa que no incluya `sslmode=require`.
- `AUTH_EXCHANGE_SECRET`: secreto compartido con el servidor web para convertir
  una identidad verificada de ChatGPT en una sesión de Nexo. Si no está
  definido, se reutiliza `JWT_SECRET` para facilitar la migración del servicio
  anterior.
- `OPENAI_API_KEY`: habilita la lectura de capturas de boletos mediante visión.
- `OPENAI_ASSISTANT_MODEL`: modelo reservado para analizar archivos, PDF e
  imágenes complejas.
- `OPENAI_VISION_MODEL`: modelo multimodal; por defecto `gpt-5.6-sol`.
- `NEXO_TEXT_API_URL`, `NEXO_TEXT_API_KEY` y `NEXO_TEXT_MODEL`: proveedor
  económico de conversación y herramientas. La configuración predeterminada
  usa la API compatible con OpenAI de Groq y `llama-3.1-8b-instant`.
- Si `NEXO_TEXT_API_KEY` no está configurada, el chat reutiliza
  `OPENAI_API_KEY` y `OPENAI_ASSISTANT_MODEL` como respaldo.
- `NEXO_TEXT_PROVIDER`: usa `groq` u `openrouter`. Para OpenRouter, Nexo exige
  Zero Data Retention y rechaza proveedores que recolecten datos.

En Groq debe activarse **Zero Data Retention** en Data Controls antes de usar
Nexo con información personal.

## Asistente

`POST /api/assistant/messages` usa dos capas:

1. Si hay archivos o imágenes, OpenAI extrae evidencia factual y elimina
   identificadores sensibles antes de continuar.
2. El proveedor de texto conversa, selecciona herramientas y propone acciones.
   La API de Nexo valida y ejecuta las herramientas; el modelo nunca accede
   directamente a PostgreSQL.

Las memorias explícitas se guardan como confirmadas. Las inferencias conservan
su confianza y quedan diferenciadas. Las escrituras financieras requieren
confirmación explícita y los estados de cuenta se deduplican.

## Autenticación

- `POST /api/auth/siwc` intercambia una identidad verificada por una sesión.
- `GET /api/auth/me` consulta el usuario de la sesión.
- `POST /api/auth/logout` revoca la sesión.

## Módulos

- `/api/auth/register`: crea una cuenta con nombre, correo y contraseña.
- `/api/auth/login`: valida credenciales y crea una sesión de 24 horas.
- `/api/auth/me` y `/api/auth/logout`: restauran o cierran la sesión.
- `/api/captures`: captura general para los siete módulos.
- `/api/finances`: cuentas, ingresos, gastos, balances y movimientos.
- `/api/events`: agenda personal con fecha, horario, ubicación y detalles.
- `/api/notes`: notas editables, etiquetas, búsqueda local y marcadores.
- `/api/bets`: boletos combinados, saldo financiero, límites y resultados
  obligatoriamente sincronizados con una cuenta de Finanzas.
- `/api/bets/extract-image`: extracción estructurada y editable de una captura
  PNG, JPG o WEBP. La imagen no se persiste en Nexo.
- `/api/meals`: comidas, macros, costos y movimientos opcionales en Finanzas.
- `/api/meals/catalog`: búsqueda limitada y cacheada en Open Food Facts con
  respaldo de ingredientes de wger.
- `/api/gym`: sesiones, ejercicios de fuerza, cardio, movilidad y volumen.
- `/api/gym/catalog`: búsqueda limitada y cacheada en el catálogo de wger.
- `/api/health`: perfil privado e historial de mediciones de salud.
- `/api/health/profile`: altura, datos médicos declarados, contacto de
  emergencia y objetivo de peso.
- `/api/health/entries`: peso, sueño, hidratación, presión, pulso, glucosa,
  oxígeno, temperatura, ánimo, síntomas y notas.
- `/api/progress`: resumen agregado de 7 o 30 días para bienvenida, actividad,
  tendencias y conexiones entre módulos.

Todas las rutas de módulos requieren un token Bearer y filtran los registros
por el usuario autenticado.
