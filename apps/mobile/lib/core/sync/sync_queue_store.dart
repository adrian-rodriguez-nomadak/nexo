import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../database/app_database.dart';

class PendingSyncOperation {
  const PendingSyncOperation({
    required this.operationId,
    required this.entity,
    required this.recordId,
    required this.operation,
    required this.baseVersion,
    required this.payload,
    required this.clientUpdatedAt,
  });

  final String operationId;
  final String entity;
  final String recordId;
  final String operation;
  final int baseVersion;
  final Map<String, dynamic>? payload;
  final DateTime clientUpdatedAt;

  Map<String, dynamic> toApiJson() => {
    'operation_id': operationId,
    'entity': entity,
    'record_id': recordId,
    'operation': operation,
    'base_version': baseVersion,
    'client_updated_at': clientUpdatedAt.toUtc().toIso8601String(),
    if (payload != null) 'payload': payload,
  };
}

class SyncQueueStore {
  const SyncQueueStore(this.database);

  final AppDatabase database;

  Future<void> initialize() async {
    await database.customStatement('''
      CREATE TABLE IF NOT EXISTS sync_queue (
        operation_id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        base_version INTEGER NOT NULL DEFAULT 0,
        payload TEXT,
        client_updated_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      )
    ''');
    await database.customStatement('''
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    ''');
    await database.customStatement('''
      CREATE TABLE IF NOT EXISTS sync_inbox (
        cursor INTEGER PRIMARY KEY,
        entity TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        version INTEGER NOT NULL,
        payload TEXT,
        changed_at TEXT NOT NULL
      )
    ''');
    await database.customStatement('''CREATE TABLE IF NOT EXISTS sync_versions (
      entity TEXT NOT NULL, record_id TEXT NOT NULL, version INTEGER NOT NULL,
      PRIMARY KEY (entity, record_id))''');
  }

  Future<void> enqueue({
    required String entity,
    required String recordId,
    required String operation,
    required Map<String, dynamic>? payload,
    int? baseVersion,
  }) async {
    await initialize();
    final effectiveVersion = baseVersion ?? await version(entity, recordId);
    final existing = await database
        .customSelect(
          'SELECT operation_id, payload FROM sync_queue WHERE entity = ? AND record_id = ? ORDER BY client_updated_at DESC LIMIT 1',
          variables: [
            Variable.withString(entity),
            Variable.withString(recordId),
          ],
        )
        .getSingleOrNull();
    if (existing != null) {
      final previousRaw = existing.readNullable<String>('payload');
      final previous = previousRaw == null
          ? <String, dynamic>{}
          : jsonDecode(previousRaw) as Map<String, dynamic>;
      final merged = operation == 'delete' ? null : {...previous, ...?payload};
      await database.customStatement(
        '''UPDATE sync_queue SET operation = ?, payload = ?,
        client_updated_at = ?, last_error = NULL
        WHERE operation_id = ?''',
        [
          operation,
          merged == null ? null : jsonEncode(merged),
          DateTime.now().millisecondsSinceEpoch,
          existing.read<String>('operation_id'),
        ],
      );
      return;
    }
    await database.customStatement(
      '''INSERT INTO sync_queue
      (operation_id, entity, record_id, operation, base_version, payload, client_updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)''',
      [
        const Uuid().v4(),
        entity,
        recordId,
        operation,
        effectiveVersion,
        payload == null ? null : jsonEncode(payload),
        DateTime.now().millisecondsSinceEpoch,
      ],
    );
  }

  Future<List<PendingSyncOperation>> pending({int limit = 100}) async {
    await initialize();
    final rows = await database
        .customSelect(
          'SELECT * FROM sync_queue ORDER BY client_updated_at ASC LIMIT ?',
          variables: [Variable.withInt(limit)],
        )
        .get();
    return rows.map((row) {
      final payload = row.readNullable<String>('payload');
      return PendingSyncOperation(
        operationId: row.read<String>('operation_id'),
        entity: row.read<String>('entity'),
        recordId: row.read<String>('record_id'),
        operation: row.read<String>('operation'),
        baseVersion: row.read<int>('base_version'),
        payload: payload == null
            ? null
            : jsonDecode(payload) as Map<String, dynamic>,
        clientUpdatedAt: DateTime.fromMillisecondsSinceEpoch(
          row.read<int>('client_updated_at'),
        ),
      );
    }).toList();
  }

  Future<void> remove(String operationId) => database.customStatement(
    'DELETE FROM sync_queue WHERE operation_id = ?',
    [operationId],
  );

  Future<void> markFailure(
    String operationId,
    String error,
  ) => database.customStatement(
    'UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE operation_id = ?',
    [error, operationId],
  );

  Future<int> version(String entity, String recordId) async {
    await initialize();
    final row = await database
        .customSelect(
          'SELECT version FROM sync_versions WHERE entity = ? AND record_id = ?',
          variables: [
            Variable.withString(entity),
            Variable.withString(recordId),
          ],
        )
        .getSingleOrNull();
    return row?.read<int>('version') ?? 0;
  }

  Future<void> setVersion(
    String entity,
    String recordId,
    int value,
  ) => database.customStatement(
    'INSERT OR REPLACE INTO sync_versions (entity, record_id, version) VALUES (?, ?, ?)',
    [entity, recordId, value],
  );

  Future<bool> hasPending(String entity, String recordId) async {
    final row = await database
        .customSelect(
          'SELECT 1 AS found FROM sync_queue WHERE entity = ? AND record_id = ? LIMIT 1',
          variables: [
            Variable.withString(entity),
            Variable.withString(recordId),
          ],
        )
        .getSingleOrNull();
    return row != null;
  }

  Future<List<Map<String, dynamic>>> staged() async {
    await initialize();
    final rows = await database
        .customSelect('SELECT * FROM sync_inbox ORDER BY cursor ASC')
        .get();
    return rows.map((row) {
      final raw = row.readNullable<String>('payload');
      return <String, dynamic>{
        'cursor': row.read<int>('cursor'),
        'entity': row.read<String>('entity'),
        'record_id': row.read<String>('record_id'),
        'operation': row.read<String>('operation'),
        'version': row.read<int>('version'),
        'payload': raw == null ? null : jsonDecode(raw) as Map<String, dynamic>,
      };
    }).toList();
  }

  Future<void> removeStaged(int cursor) => database.customStatement(
    'DELETE FROM sync_inbox WHERE cursor = ?',
    [cursor],
  );

  Future<int> cursor() async {
    await initialize();
    final row = await database
        .customSelect("SELECT value FROM sync_metadata WHERE key = 'cursor'")
        .getSingleOrNull();
    return int.tryParse(row?.read<String>('value') ?? '') ?? 0;
  }

  Future<void> stageRemote(
    List<Map<String, dynamic>> changes,
    int nextCursor,
  ) async {
    await initialize();
    await database.transaction(() async {
      for (final change in changes) {
        await database.customStatement(
          '''INSERT OR IGNORE INTO sync_inbox
          (cursor, entity, record_id, operation, version, payload, changed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)''',
          [
            change['cursor'],
            change['entity'],
            change['record_id'],
            change['operation'],
            change['version'],
            change['payload'] == null ? null : jsonEncode(change['payload']),
            change['changed_at'].toString(),
          ],
        );
      }
      await database.customStatement(
        "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('cursor', ?)",
        [nextCursor.toString()],
      );
    });
  }
}
