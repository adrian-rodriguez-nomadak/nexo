import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

import 'daos/calendar_dao.dart';
import 'daos/debts_dao.dart';
import 'daos/finances_dao.dart';
import 'daos/inbox_dao.dart';
import 'daos/reminders_dao.dart';
import 'daos/subscriptions_dao.dart';
import 'daos/tasks_dao.dart';
import 'tables/calendar_tables.dart';
import 'tables/debt_tables.dart';
import 'tables/finance_tables.dart';
import 'tables/inbox_tables.dart';
import 'tables/reminder_tables.dart';
import 'tables/subscription_tables.dart';
import 'tables/task_tables.dart';

part 'app_database.g.dart';

@DriftDatabase(
  tables: [
    FinanceMovements,
    UpcomingPayments,
    CalendarEvents,
    TaskItems,
    ReminderItems,
    Subscriptions,
    Debts,
    DebtPayments,
    InboxActions,
  ],
  daos: [
    FinancesDao,
    CalendarDao,
    TasksDao,
    RemindersDao,
    SubscriptionsDao,
    DebtsDao,
    InboxDao,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (migrator) => migrator.createAll(),
    beforeOpen: (details) async {
      await customStatement('''CREATE TABLE IF NOT EXISTS sync_queue (
        operation_id TEXT PRIMARY KEY, entity TEXT NOT NULL,
        record_id TEXT NOT NULL, operation TEXT NOT NULL,
        base_version INTEGER NOT NULL DEFAULT 0, payload TEXT,
        client_updated_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT)''');
      await customStatement('''CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY, value TEXT NOT NULL)''');
      await customStatement('''CREATE TABLE IF NOT EXISTS sync_inbox (
        cursor INTEGER PRIMARY KEY, entity TEXT NOT NULL,
        record_id TEXT NOT NULL, operation TEXT NOT NULL,
        version INTEGER NOT NULL, payload TEXT, changed_at TEXT NOT NULL)''');
      await customStatement('''CREATE TABLE IF NOT EXISTS sync_versions (
        entity TEXT NOT NULL, record_id TEXT NOT NULL, version INTEGER NOT NULL,
        PRIMARY KEY (entity, record_id))''');
    },
  );
}

QueryExecutor _openConnection() {
  return driftDatabase(name: 'nexo_local');
}
