import '../../../core/database/app_database.dart';
import '../../../core/utils/id_generator.dart';
import '../../../core/sync/sync_queue_store.dart';

class FinanceCategory {
  const FinanceCategory({required this.id, required this.name});

  final String id;
  final String name;
}

class CategoriesService {
  const CategoriesService(this.database, {this.syncQueue});

  final AppDatabase database;
  final SyncQueueStore? syncQueue;

  Future<List<FinanceCategory>> getAll() async {
    final rows = await database
        .customSelect(
          'SELECT id, name FROM finance_categories ORDER BY name COLLATE NOCASE',
        )
        .get();
    return rows
        .map(
          (row) => FinanceCategory(
            id: row.read<String>('id'),
            name: row.read<String>('name'),
          ),
        )
        .toList();
  }

  Future<void> add(String name) async {
    final id = localId('category');
    await database.customStatement(
      '''INSERT OR IGNORE INTO finance_categories (id, name, created_at)
       VALUES (?, ?, ?)''',
      [id, name.trim(), DateTime.now().millisecondsSinceEpoch],
    );
    await syncQueue?.enqueue(
      entity: 'finance_category',
      recordId: id,
      operation: 'upsert',
      payload: {'name': name.trim()},
    );
  }

  Future<void> delete(String id) async {
    await database.customStatement(
      'DELETE FROM finance_categories WHERE id = ?',
      [id],
    );
    await syncQueue?.enqueue(
      entity: 'finance_category',
      recordId: id,
      operation: 'delete',
      payload: null,
    );
  }
}
