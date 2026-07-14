import 'dart:convert';

import '../../../core/database/app_database.dart';

class LocalDataSummary {
  const LocalDataSummary({required this.counts});

  final Map<String, int> counts;
  int get total => counts.values.fold(0, (sum, count) => sum + count);
}

class LocalDataRestoreResult {
  const LocalDataRestoreResult({required this.restored});

  final int restored;
}

class LocalDataService {
  const LocalDataService(this.database);

  final AppDatabase database;

  static const tables = <String, String>{
    'Cuentas': 'finance_accounts',
    'Presupuestos': 'finance_budgets',
    'Categorías': 'finance_categories',
    'Transferencias': 'finance_transfers',
    'Movimientos': 'finance_movements',
    'Asignaciones de cuenta': 'finance_movement_accounts',
    'Pagos próximos': 'upcoming_payments',
    'Eventos': 'calendar_events',
    'Tareas': 'task_items',
    'Recordatorios': 'reminder_items',
    'Suscripciones': 'subscriptions',
    'Deudas': 'debts',
    'Abonos': 'debt_payments',
    'Inbox': 'inbox_actions',
  };

  Future<LocalDataSummary> summary() async {
    final counts = <String, int>{};
    for (final entry in tables.entries) {
      final row = await database
          .customSelect('SELECT COUNT(*) AS total FROM ${entry.value}')
          .getSingle();
      counts[entry.key] = row.read<int>('total');
    }
    return LocalDataSummary(counts: counts);
  }

  Future<String> exportJson() async {
    final data = <String, Object?>{};
    for (final entry in tables.entries) {
      final rows = await database
          .customSelect('SELECT * FROM ${entry.value}')
          .get();
      data[entry.value] = rows.map((row) => row.data).toList();
    }
    return const JsonEncoder.withIndent('  ').convert({
      'format': 'nexo-local-backup',
      'version': 1,
      'exported_at': DateTime.now().toUtc().toIso8601String(),
      'data': data,
    });
  }

  Future<LocalDataRestoreResult> restoreJson(String source) async {
    final decoded = jsonDecode(source);
    if (decoded is! Map<String, dynamic> ||
        decoded['format'] != 'nexo-local-backup' ||
        decoded['version'] != 1 ||
        decoded['data'] is! Map<String, dynamic>) {
      throw const FormatException('El respaldo no es compatible con Nexo.');
    }

    final data = decoded['data'] as Map<String, dynamic>;
    final allowedTables = tables.values.toSet();
    if (data.keys.any((table) => !allowedTables.contains(table))) {
      throw const FormatException('El respaldo contiene tablas no permitidas.');
    }

    var restored = 0;
    await database.transaction(() async {
      for (final table in allowedTables.toList().reversed) {
        await database.customStatement('DELETE FROM $table');
      }
      for (final table in allowedTables) {
        final rawRows = data[table] ?? const <Object?>[];
        if (rawRows is! List) {
          throw FormatException('Datos inválidos en $table.');
        }
        final info = await database
            .customSelect('PRAGMA table_info($table)')
            .get();
        final allowedColumns = info
            .map((row) => row.read<String>('name'))
            .toSet();
        for (final rawRow in rawRows) {
          if (rawRow is! Map<String, dynamic> || rawRow.isEmpty) {
            throw FormatException('Registro inválido en $table.');
          }
          final columns = rawRow.keys.toList();
          if (columns.any((column) => !allowedColumns.contains(column))) {
            throw FormatException('Columna no permitida en $table.');
          }
          final placeholders = List.filled(columns.length, '?').join(', ');
          await database.customStatement(
            'INSERT INTO $table (${columns.join(', ')}) VALUES ($placeholders)',
            columns.map((column) => rawRow[column]).toList(),
          );
          restored++;
        }
      }
    });
    return LocalDataRestoreResult(restored: restored);
  }
}
