import '../models/task_item.dart';

abstract class TasksRepository {
  Future<List<TaskItem>> getTasks();
}
