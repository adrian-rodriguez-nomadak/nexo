# Nexo

Nexo es un sistema operativo personal que conecta dinero, tiempo y bienestar.

## Estado

La primera base incluye:

- aplicación móvil en Flutter;
- dashboard web con backend integrado;
- persistencia de capturas en Cloudflare D1;
- API para consultar, crear y eliminar capturas;
- pantalla principal "Hoy";
- captura rápida persistente en web y temporal en móvil;
- módulos de finanzas, eventos, notas, apuestas, comidas, salud y gimnasio;
- espacio de progreso para futuras relaciones entre módulos.

La autenticación y sincronización entre web y móvil todavía no están
implementadas.

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
npm install
npm run dev
```
