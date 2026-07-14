import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/core/database/app_database.dart';
import 'package:nexo_mobile/modules/settings/data/local_data_service.dart';

void main() {
  late AppDatabase database;
  late LocalDataService service;

  setUp(() {
    database = AppDatabase.forTesting(NativeDatabase.memory());
    service = LocalDataService(database);
  });

  tearDown(() => database.close());

  Future<void> insertAccount(String id, String name) =>
      database.customStatement(
        '''INSERT INTO finance_accounts
           (id, name, type, initial_balance, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)''',
        [id, name, 'Efectivo', 250.0, 1, 1],
      );

  test('exports and restores local records', () async {
    await insertAccount('account-original', 'Cuenta principal');
    final backup = await service.exportJson();

    await database.customStatement('DELETE FROM finance_accounts');
    await insertAccount('account-temporary', 'Temporal');

    final result = await service.restoreJson(backup);
    final rows = await database
        .customSelect('SELECT id, name FROM finance_accounts')
        .get();

    expect(result.restored, greaterThan(0));
    expect(rows, hasLength(1));
    expect(rows.single.read<String>('id'), 'account-original');
    expect(rows.single.read<String>('name'), 'Cuenta principal');
  });

  test('rejects unknown tables without changing local data', () async {
    await insertAccount('account-safe', 'Cuenta segura');
    final invalid = jsonEncode({
      'format': 'nexo-local-backup',
      'version': 1,
      'data': {'finance_accounts': <Object?>[], 'users': <Object?>[]},
    });

    await expectLater(service.restoreJson(invalid), throwsFormatException);
    final row = await database
        .customSelect(
          'SELECT name FROM finance_accounts WHERE id = ?',
          variables: const [Variable<String>('account-safe')],
        )
        .getSingle();
    expect(row.read<String>('name'), 'Cuenta segura');
  });

  test('rolls back the replacement when a restored row is invalid', () async {
    await insertAccount('account-safe', 'Cuenta segura');
    final invalid = jsonEncode({
      'format': 'nexo-local-backup',
      'version': 1,
      'data': {
        'finance_accounts': [
          {'id': 'broken'},
        ],
      },
    });

    await expectLater(service.restoreJson(invalid), throwsA(isA<Exception>()));
    final row = await database
        .customSelect(
          'SELECT name FROM finance_accounts WHERE id = ?',
          variables: const [Variable<String>('account-safe')],
        )
        .getSingle();
    expect(row.read<String>('name'), 'Cuenta segura');
  });
}
