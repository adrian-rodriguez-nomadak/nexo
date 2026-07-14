import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/core/database/app_database.dart';
import 'package:nexo_mobile/core/sync/sync_queue_store.dart';
import 'package:nexo_mobile/core/sync/sync_remote_applier.dart';

void main() {
  late AppDatabase database;
  late SyncQueueStore store;
  late SyncRemoteApplier applier;

  setUp(() {
    database = AppDatabase.forTesting(NativeDatabase.memory());
    store = SyncQueueStore(database);
    applier = SyncRemoteApplier(database, store);
  });

  tearDown(() => database.close());

  Map<String, dynamic> change({
    required int cursor,
    required String entity,
    required String id,
    required Map<String, dynamic>? payload,
    String operation = 'upsert',
  }) => {
    'cursor': cursor,
    'entity': entity,
    'record_id': id,
    'operation': operation,
    'version': 1,
    'payload': payload,
    'changed_at': '2026-07-14T12:00:00.000Z',
  };

  test('applies financial account and its associated movement', () async {
    await store.stageRemote([
      change(
        cursor: 1,
        entity: 'finance_account',
        id: 'account-1',
        payload: {
          'name': 'Cuenta sincronizada',
          'type': 'Banco',
          'initial_balance': 1000,
        },
      ),
      change(
        cursor: 2,
        entity: 'finance_movement',
        id: 'movement-1',
        payload: {
          'type': 'expense',
          'amount': 250,
          'description': 'Compra sincronizada',
          'movement_date': '2026-07-14T12:00:00.000Z',
          'account_id': 'account-1',
        },
      ),
    ], 2);

    expect(await applier.applyStaged(), 2);
    final accounts = await database.financesDao.getAccounts();
    final movements = await database.financesDao.getMovements();

    expect(accounts.single.name, 'Cuenta sincronizada');
    expect(accounts.single.currentBalance, 750);
    expect(movements.single.description, 'Compra sincronizada');
    expect(await store.version('finance_movement', 'movement-1'), 1);
    expect(await store.staged(), isEmpty);
  });

  test('remote account deletion cleans associations and transfers', () async {
    await store.stageRemote([
      change(
        cursor: 1,
        entity: 'finance_account',
        id: 'account-1',
        payload: {'name': 'Origen', 'type': 'Banco', 'initial_balance': 1000},
      ),
      change(
        cursor: 2,
        entity: 'finance_account',
        id: 'account-2',
        payload: {'name': 'Destino', 'type': 'Efectivo', 'initial_balance': 0},
      ),
      change(
        cursor: 3,
        entity: 'finance_movement',
        id: 'movement-1',
        payload: {
          'type': 'expense',
          'amount': 100,
          'movement_date': '2026-07-14T12:00:00.000Z',
          'account_id': 'account-1',
        },
      ),
      change(
        cursor: 4,
        entity: 'finance_transfer',
        id: 'transfer-1',
        payload: {
          'from_account_id': 'account-1',
          'to_account_id': 'account-2',
          'amount': 50,
        },
      ),
    ], 4);
    await applier.applyStaged();

    await store.stageRemote([
      change(
        cursor: 5,
        entity: 'finance_account',
        id: 'account-1',
        operation: 'delete',
        payload: null,
      ),
    ], 5);
    expect(await applier.applyStaged(), 1);

    final accounts = await database.financesDao.getAccounts();
    final assignmentCount = await database
        .customSelect('SELECT COUNT(*) AS total FROM finance_movement_accounts')
        .getSingle();
    final transferCount = await database
        .customSelect('SELECT COUNT(*) AS total FROM finance_transfers')
        .getSingle();
    expect(accounts.map((account) => account.id), ['account-2']);
    expect(assignmentCount.read<int>('total'), 0);
    expect(transferCount.read<int>('total'), 0);
  });

  test('does not overwrite a record with a pending local operation', () async {
    await store.enqueue(
      entity: 'finance_account',
      recordId: 'account-1',
      operation: 'upsert',
      payload: {'name': 'Cuenta local'},
    );
    await store.stageRemote([
      change(
        cursor: 1,
        entity: 'finance_account',
        id: 'account-1',
        payload: {
          'name': 'Cuenta remota',
          'type': 'Banco',
          'initial_balance': 100,
        },
      ),
    ], 1);

    expect(await applier.applyStaged(), 0);
    expect(await database.financesDao.getAccounts(), isEmpty);
    expect(await store.staged(), hasLength(1));
  });
}
