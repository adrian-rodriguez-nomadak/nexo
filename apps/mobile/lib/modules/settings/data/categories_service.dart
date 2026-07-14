import '../../../core/database/app_database.dart';
import '../../../core/utils/id_generator.dart';

class FinanceCategory {
  const FinanceCategory({required this.id, required this.name});

  final String id;
  final String name;
}

class CategoriesService {
  const CategoriesService(this.database);

  final AppDatabase database;

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

  Future<void> add(String name) => database.customStatement(
    '''INSERT OR IGNORE INTO finance_categories (id, name, created_at)
       VALUES (?, ?, ?)''',
    [localId('category'), name.trim(), DateTime.now().millisecondsSinceEpoch],
  );

  Future<void> delete(String id) => database.customStatement(
    'DELETE FROM finance_categories WHERE id = ?',
    [id],
  );
}
