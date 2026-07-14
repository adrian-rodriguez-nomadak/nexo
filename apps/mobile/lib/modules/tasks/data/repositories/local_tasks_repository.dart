import 'package:drift/drift.dart';

import '../../../../core/database/app_database.dart' as db;
import '../../../../core/utils/id_generator.dart';
import '../../domain/models/task_item.dart';
import '../../domain/repositories/tasks_repository.dart';
import '../../../../core/sync/sync_queue_store.dart';

class LocalTasksRepository implements TasksRepository {
  const LocalTasksRepository(this.database, {this.syncQueue});

  final db.AppDatabase database;
  final SyncQueueStore? syncQueue;

  @override
  Future<List<TaskItem>> getTasks() async {
    final rows = await database.tasksDao.getTasks();
    return rows.map(_fromRow).toList();
  }

  Future<void> createTask({
    required String title,
    String? description,
    String priority = 'medium',
  }) async {
    final now = DateTime.now();
    final id = localId('task');
    await database.tasksDao.insertTask(
      db.TaskItemsCompanion.insert(
        id: id,
        title: title,
        description: Value(description),
        dueDate: Value(now),
        priority: priority,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await syncQueue?.enqueue(
      entity: 'task',
      recordId: id,
      operation: 'upsert',
      payload: {
        'title': title,
        'description': description,
        'priority': priority,
        'status': 'pending',
      },
    );
  }

  Future<void> updateTask({
    required String id,
    required String title,
    String? description,
    required String priority,
  }) async {
    await database.tasksDao.updateTask(
      id,
      db.TaskItemsCompanion(
        title: Value(title),
        description: Value(description),
        priority: Value(priority),
        syncStatus: const Value('local'),
        updatedAt: Value(DateTime.now()),
      ),
    );
    await syncQueue?.enqueue(
      entity: 'task',
      recordId: id,
      operation: 'upsert',
      payload: {
        'title': title,
        'description': description,
        'priority': priority,
      },
    );
  }

  Future<void> updateStatus(String id, String status) async {
    await database.tasksDao.updateTaskStatus(id, status);
    await syncQueue?.enqueue(
      entity: 'task',
      recordId: id,
      operation: 'upsert',
      payload: {'status': status},
    );
  }

  Future<void> deleteTask(String id) async {
    await database.tasksDao.deleteTask(id);
    await syncQueue?.enqueue(
      entity: 'task',
      recordId: id,
      operation: 'delete',
      payload: null,
    );
  }

  TaskItem _fromRow(db.TaskItem row) {
    return TaskItem(
      id: row.id,
      title: row.title,
      description: row.description,
      dueDate: row.dueDate,
      priority: row.priority,
      status: row.status,
    );
  }
}
