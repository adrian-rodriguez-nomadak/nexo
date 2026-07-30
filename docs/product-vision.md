# Visión de producto

## Promesa

Nexo es una sola conversación para organizar la vida. La persona habla con
naturalidad; Nexo entiende lo que ocurrió, lo relaciona con el contexto
existente, conserva lo que será útil y ayuda a actuar.

> Cuéntale cualquier cosa a Nexo. Él la entiende, la conecta, la recuerda y te
> ayuda a actuar.

Finanzas, agenda, tareas, personas, salud, proyectos, hábitos, hogar, viajes e
ideas son temas que el asistente puede reconocer. No son secciones que el
usuario deba elegir antes de escribir.

## Experiencia principal

La aplicación es el chat.

1. La persona escribe o adjunta evidencia.
2. Nexo identifica intención, tema, fecha y entidades relacionadas.
3. Separa conversación, registro concreto y memoria duradera.
4. Ejecuta lecturas o escrituras permitidas.
5. Explica qué hizo y conserva el contexto para recuperarlo después.

Un mensaje puede atravesar varios temas sin que la interfaz cambie:

> “El viernes recuérdame pagarle a Carlos los $500 del hotel.”

Nexo relaciona un recordatorio, una fecha, una persona, una obligación
financiera y un viaje dentro del mismo contexto.

## Temas comprendidos

- finanzas;
- calendario y tiempo;
- tareas y pendientes;
- personas y relaciones;
- notas e ideas;
- proyectos;
- salud y bienestar;
- hábitos y rutinas;
- metas;
- trabajo y aprendizaje;
- hogar y compras;
- viajes y movilidad;
- alimentación;
- entretenimiento;
- documentos;
- vehículos;
- diario personal.

Esta taxonomía sirve para organizar internamente, recuperar información y
aplicar políticas. No determina la navegación del producto.

## Modelo de contexto

Nexo distingue tres capas:

### Conversación

El historial conserva el intercambio visible para mantener continuidad
inmediata.

### Registros

Representan cosas concretas: tareas, eventos, notas, transacciones,
recordatorios, mediciones, decisiones o documentos. Cada registro puede tener:

- tema principal;
- tipo;
- contenido;
- estado;
- fecha de ocurrencia o vencimiento;
- personas, lugares, proyectos u objetos relacionados;
- sensibilidad;
- procedencia y confianza.

### Memorias

Representan contexto duradero como hechos, preferencias, objetivos y patrones.
Una memoria conserva procedencia, confianza, sensibilidad, vigencia,
confirmación y deduplicación. Una inferencia nunca se presenta como un hecho
confirmado.

## Principios

1. Hablar debe ser más fácil que clasificar.
2. La interfaz no expone la arquitectura interna.
3. Nexo no inventa contexto personal ausente.
4. Cada escritura se confirma con el resultado real de una herramienta.
5. Las transacciones financieras y los registros restringidos requieren
   confirmación explícita.
6. La memoria es selectiva: no todo mensaje merece conservarse.
7. Los datos sensibles son privados por diseño.
8. En salud, Nexo organiza y orienta con prudencia; no diagnostica.
9. La persona puede revisar, corregir y eliminar su información.

## Arquitectura de transición

El almacén contextual unificado es el nuevo núcleo. Las rutas especializadas
existentes se conservan temporalmente para compatibilidad y migración de datos,
pero la web ya no depende de dashboards ni formularios por módulo. Las nuevas
capacidades se exponen primero como herramientas del asistente.

## Siguiente evolución

1. Confirmar el modelo contextual y migrar registros heredados.
2. Añadir relaciones explícitas entre entidades.
3. Incorporar recordatorios ejecutables y calendario externo.
4. Permitir revisión y borrado de memoria desde la propia conversación.
5. Añadir voz como entrada principal opcional.
6. Sincronizar la aplicación móvil con el mismo chat y contexto.
