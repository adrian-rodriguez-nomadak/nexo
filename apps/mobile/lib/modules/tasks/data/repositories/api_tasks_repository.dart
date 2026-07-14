import '../../../../core/http/api_client.dart';
import '../../domain/models/task_item.dart';
import '../../domain/repositories/tasks_repository.dart';

class ApiTasksRepository implements TasksRepository {
  const ApiTasksRepository({this.client = const ApiClient()});

  final ApiClient client;

  @override
  Future<List<TaskItem>> getTasks() async {
    final data = await client.get('/tasks');
    return (data as List)
        .map((item) => TaskItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<TaskItem> createTask(Map<String, dynamic> body) async {
    final data = await client.post('/tasks', body);
    return TaskItem.fromJson(data as Map<String, dynamic>);
  }

  Future<TaskItem> updateTask(String id, Map<String, dynamic> body) async {
    final data = await client.patch('/tasks/$id', body);
    return TaskItem.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteTask(String id) async {
    await client.delete('/tasks/$id');
  }
}
