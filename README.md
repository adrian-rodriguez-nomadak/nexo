# Nexo

Nexo es un sistema operativo personal que conecta dinero, tiempo y bienestar.

## Estado

La primera base incluye:

- aplicación móvil en Flutter;
- dashboard web separado del backend;
- API Node independiente desplegable en Render;
- persistencia PostgreSQL para capturas y finanzas;
- agenda de eventos persistente;
- biblioteca de notas con búsqueda, etiquetas y notas fijadas;
- boletos combinados de apuestas con saldo financiero, límite y resultados;
- importación de capturas de apuestas con extracción visual editable;
- conexión contable entre apuestas y cuentas de Finanzas;
- registro de comidas con macros, costo y gasto opcional en Finanzas;
- sesiones de gimnasio con ejercicios, volumen, tiempo y progreso;
- perfil de salud con altura, tipo de sangre, alergias, antecedentes,
  medicamentos, contacto de emergencia y peso meta;
- historial de peso, sueño, agua, presión, pulso, glucosa, oxígeno,
  temperatura, estado de ánimo y síntomas;
- inicio público, registro e inicio de sesión por correo con datos aislados por
  usuario;
- API heredada para conservar capturas existentes;
- asistente web como experiencia principal, con archivos PDF, documentos,
  presentaciones, hojas de cálculo, texto, código e imágenes;
- bienvenida personalizada con primeros pasos y resumen semanal;
- progreso agregado de 7 y 30 días con tendencias y conexiones entre módulos;
- módulos dedicados de finanzas, eventos, notas, apuestas, comidas, salud y
  gimnasio;
- espacio de progreso para futuras relaciones entre módulos.
- Observador web con pantalla compartida, análisis visual selectivo y permisos
  independientes por módulo;
- memoria personal con procedencia, confianza, sensibilidad, confirmación y
  deduplicación de hechos repetidos;
- sincronización opcional de registros confirmados con memorias privadas de Omi.

La autenticación web con credenciales está implementada. La aplicación móvil todavía funciona
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
