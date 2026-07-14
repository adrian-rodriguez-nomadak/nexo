import 'dart:convert';

import '../../../core/database/app_database.dart';

class LocalDataSummary {
  const LocalDataSummary({required this.counts});

  final Map<String, int> counts;
  int get total => counts.values.fold(0, (sum, count) => sum + count);
}

class LocalDataService {
  const LocalDataService(this.database);

  final AppDatabase database;

  static const tables = <String, String>{
    'Cuentas': 'finance_accounts',
    'Presupuestos': 'finance_budgets',
    'Categorías': 'finance_categories',
    'Movimientos': 'finance_movements',
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
}
