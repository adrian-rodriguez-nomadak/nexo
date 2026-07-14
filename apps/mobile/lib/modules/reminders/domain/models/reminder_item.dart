import '../../../../core/utils/json_read.dart';

class ReminderItem {
  const ReminderItem({
    required this.id,
    required this.title,
    required this.remindAt,
    this.description,
    this.repeatType = 'none',
    this.status = 'pending',
  });

  final String id;
  final String title;
  final DateTime remindAt;
  final String? description;
  final String repeatType;
  final String status;

  factory ReminderItem.fromJson(Map<String, dynamic> json) {
    return ReminderItem(
      id: json['id'].toString(),
      title: json['title']?.toString() ?? '',
      remindAt: readDateTime(json['remind_at'] ?? json['remindAt']),
      description: json['description']?.toString(),
      repeatType: json['repeat_type']?.toString() ?? 'none',
      status: json['status']?.toString() ?? 'pending',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      if (description != null) 'description': description,
      'remind_at': remindAt.toIso8601String(),
      'repeat_type': repeatType,
      'status': status,
    };
  }
}
