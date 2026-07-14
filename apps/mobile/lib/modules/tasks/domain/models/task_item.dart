import '../../../../core/utils/json_read.dart';

class TaskItem {
  const TaskItem({
    required this.id,
    required this.title,
    this.description,
    this.dueDate,
    this.priority = 'medium',
    this.status = 'pending',
  });

  final String id;
  final String title;
  final String? description;
  final DateTime? dueDate;
  final String priority;
  final String status;

  factory TaskItem.fromJson(Map<String, dynamic> json) {
    return TaskItem(
      id: json['id'].toString(),
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      dueDate: readNullableDateTime(json['due_date'] ?? json['dueDate']),
      priority: json['priority']?.toString() ?? 'medium',
      status: json['status']?.toString() ?? 'pending',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      if (description != null) 'description': description,
      if (dueDate != null)
        'due_date': dueDate!.toIso8601String().split('T').first,
      'priority': priority,
      'status': status,
    };
  }
}
