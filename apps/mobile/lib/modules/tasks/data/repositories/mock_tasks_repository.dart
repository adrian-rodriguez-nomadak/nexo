import '../../domain/models/task_item.dart';
import '../../domain/repositories/tasks_repository.dart';

class MockTasksRepository implements TasksRepository {
  @override
  Future<List<TaskItem>> getTasks() async {
    return [
      TaskItem(
        id: 'mock-task-1',
        title: 'Enviar comprobante',
        dueDate: DateTime(2026, 7, 8),
      ),
    ];
  }
}
