# Nexo Web

Dashboard web de Nexo construido sobre Vinext. La API vive de forma
independiente en `backend/api`.

La web incluye inicio público, registro e inicio de sesión propios. Las
contraseñas se derivan con `scrypt` en el backend y la sesión de Nexo se
restaura en el navegador mientras siga vigente.

## Finanzas

El primer módulo funcional permite crear cuentas en MXN, registrar ingresos y
gastos, consultar balances por cuenta y revisar el flujo neto consolidado.

## Eventos

La agenda permite crear eventos con fecha, horario, opción de día completo,
ubicación y detalles; también muestra próximos eventos, compromisos del día e
historial.

## Notas

La biblioteca de notas permite crear, editar, fijar y eliminar contenido.
Incluye búsqueda inmediata y organización mediante hasta ocho etiquetas por
nota.

## Apuestas

El registro de apuestas controla monto en juego, cuotas y resultados usando el
saldo real de las cuentas de Finanzas.
Cada boleto requiere una cuenta de Finanzas y admite una o más selecciones. La
cuota total puede escribirse directamente o calcularse con las cuotas
individuales. Las casas disponibles inicialmente son Caliente, Draftea y Otro.
También se puede subir una captura: Nexo extrae los campos, señala lo que falta
y deja el formulario editable antes de guardar. El gasto inicial, los cobros y
las devoluciones se sincronizan con la cuenta seleccionada.

## Comidas

El diario de comidas registra desayuno, comida, cena o snack con fecha,
calorías, proteína, carbohidratos, grasa y notas. Un costo opcional genera un
gasto en la cuenta de Finanzas elegida; al eliminar la comida también se elimina
el movimiento relacionado. La búsqueda opcional usa Open Food Facts con wger
como respaldo y copia valores por 100 g al formulario para que la persona los
ajuste a su porción.

## Gimnasio

Cada sesión de gimnasio guarda fecha, duración, notas y uno o más ejercicios de
fuerza, cardio o movilidad. El historial calcula sesiones y minutos semanales,
volumen total de fuerza y la carga máxima registrada. El nombre de la sesión se
genera con su fecha y el catálogo opcional de ejercicios proviene de wger.

## Salud

El perfil privado guarda altura, tipo de sangre, alergias, antecedentes,
medicamentos, contacto de emergencia y peso meta. El historial admite peso,
sueño, agua, presión, pulso, glucosa, oxígeno, temperatura, estado de ánimo,
síntomas y notas sin presentar diagnósticos.

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

El registro y el inicio de sesión solo requieren que `NEXT_PUBLIC_API_URL`
apunte al backend y que su origen esté permitido en `CORS_ORIGIN`.

## Verificación

```bash
npm run build
npm test
```
