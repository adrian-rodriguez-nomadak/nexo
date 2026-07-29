# Nexo Mobile

Aplicación Flutter de Nexo.

## Desarrollo

```bash
flutter pub get
flutter run
```

La app usa el backend público de Nexo por defecto. Para probar contra una API
local desde un teléfono o emulador:

```bash
flutter run --dart-define=NEXO_API_URL=http://IP_DE_TU_COMPUTADORA:3001
```

En el emulador de Android, `IP_DE_TU_COMPUTADORA` puede sustituirse por
`10.0.2.2`. Un teléfono físico no puede acceder al `localhost` de la
computadora.

El inicio de sesión usa las mismas cuentas y datos que la aplicación web. El
token se guarda en el almacenamiento seguro del sistema.

## Calidad

```bash
flutter analyze
flutter test
```
