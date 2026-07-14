import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/task_tables.dart';

part 'tasks_dao.g.dart';

@DriftAccessor(tables: [TaskItems])
class TasksDao extends DatabaseAccessor<AppDatabase> with _$TasksDaoMixin {
  TasksDao(super.db);

  Future<List<TaskItem>> getTasks() {
    return (select(
      taskItems,
    )..orderBy([(table) => OrderingTerm.asc(table.dueDate)])).get();
  }

  Future<void> insertTask(TaskItemsCompanion task) {
    return into(taskItems).insertOnConflictUpdate(task);
  }

  Future<void> updateTask(String id, TaskItemsCompanion task) {
    return (update(
      taskItems,
    )..where((table) => table.id.equals(id))).write(task);
  }

  Future<void> updateTaskStatus(String id, String status) {
    return (update(taskItems)..where((table) => table.id.equals(id))).write(
      TaskItemsCompanion(
        status: Value(status),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> deleteTask(String id) {
    return (delete(taskItems)..where((table) => table.id.equals(id))).go();
  }
}
