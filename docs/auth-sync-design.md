# Diseño de autenticación y sincronización

Estado: diseño aprobado para implementar después de estabilizar el CRUD local. Este documento no activa autenticación ni tráfico de sincronización.

## Principios

- La app sigue funcionando sin conexión y SQLite conserva la copia operativa.
- El backend almacena una réplica por usuario y nunca acepta un `userId` enviado dentro del cuerpo; lo obtiene del access token.
- Todos los registros usan IDs UUID/ULID generados por el cliente, `createdAt`, `updatedAt`, `deletedAt`, `version` y `syncStatus`.
- Las eliminaciones sincronizables son lógicas. La purga física ocurre después del periodo de retención.
- Fechas de negocio se guardan con zona horaria explícita; timestamps técnicos usan UTC.

## Autenticación

### Flujo

1. `POST /api/auth/register` crea usuario y sesión.
2. `POST /api/auth/login` valida credenciales y crea sesión.
3. El backend devuelve un access token corto (15 minutos) y un refresh token rotatorio (30 días).
4. Flutter guarda el refresh token en Keychain/Keystore y mantiene el access token en memoria.
5. `POST /api/auth/refresh` rota el refresh token. Reutilizar uno revocado invalida toda la familia de sesión.
6. `POST /api/auth/logout` revoca la sesión actual; `POST /api/auth/logout-all` revoca todas.

### Tablas mínimas

- `users`: id, email normalizado único, passwordHash, status, createdAt, updatedAt.
- `sessions`: id, userId, refreshTokenHash, tokenFamily, deviceName, expiresAt, revokedAt, lastUsedAt.
- `devices`: id, userId, installationId, platform, pushToken, lastSyncCursor, createdAt, updatedAt.

Las contraseñas se almacenan con Argon2id o bcrypt con costo revisado. Se aplica rate limit a registro, login y refresh. Los mensajes de error no revelan si un correo existe.

## Contrato de sincronización

### Push

`POST /api/sync/push`

```json
{
  "deviceId": "device-id",
  "batchId": "idempotency-id",
  "changes": [
    {
      "entity": "task",
      "id": "task-id",
      "operation": "upsert",
      "baseVersion": 3,
      "clientUpdatedAt": "2026-07-13T18:00:00Z",
      "payload": {}
    }
  ]
}
```

La respuesta informa por cambio: `accepted`, `conflict` o `rejected`, además de la versión de servidor. `batchId` hace el reintento idempotente.

### Pull

`GET /api/sync/pull?cursor=<opaque>&limit=500`

Devuelve cambios ordenados y un cursor opaco nuevo. Incluye tombstones para eliminaciones. El cursor pertenece al usuario autenticado, no al dispositivo.

### Secuencia del cliente

1. Guardar primero en Drift y marcar `syncStatus = pending`.
2. Enviar lotes pendientes conservando su `baseVersion`.
3. Aplicar resultados aceptados y actualizar versión/estado.
4. Descargar desde el último cursor confirmado.
5. Aplicar el lote remoto dentro de una transacción Drift.
6. Confirmar el cursor únicamente después del commit local.

## Conflictos

- Si `baseVersion` coincide, el servidor acepta y aumenta `version`.
- Si no coincide y solo cambian campos distintos, el servidor puede fusionar por campo.
- Si el mismo campo cambió en ambos lados, se conserva la versión del servidor y se crea un conflicto local visible para el usuario.
- Pagos, importes de deuda y movimientos financieros no usan “última escritura gana”; requieren operación idempotente o revisión explícita.
- Una eliminación entra en conflicto con una edición posterior y requiere confirmación antes de restaurar.

## Cambios necesarios antes de implementar

1. Añadir `ownerId`, `version` y `deletedAt` a todas las tablas locales y modelos del backend.
2. Crear una tabla local `sync_queue` con operationId, entity, recordId, operation, baseVersion, payload, attempts y lastError.
3. Convertir eliminaciones locales en tombstones.
4. Añadir migraciones versionadas de Drift y Sequelize.
5. Implementar primero auth y aislamiento por usuario; después push/pull.
6. Probar dos dispositivos, reintentos, lotes duplicados, reloj incorrecto, pérdida de red y conflictos financieros.

## Fuera de alcance inicial

- Sincronización en tiempo real por sockets.
- Compartir registros entre usuarios.
- Recuperación de cuenta avanzada.
- Resolución automática mediante IA.
