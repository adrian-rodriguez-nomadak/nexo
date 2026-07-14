import '../../../../core/utils/json_read.dart';

class CalendarEvent {
  const CalendarEvent({
    required this.id,
    required this.title,
    required this.startAt,
    this.description,
    this.endAt,
    this.locationName,
    this.repeatType = 'none',
    this.status = 'scheduled',
  });

  final String id;
  final String title;
  final DateTime startAt;
  final String? description;
  final DateTime? endAt;
  final String? locationName;
  final String repeatType;
  final String status;

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id'].toString(),
      title: json['title']?.toString() ?? '',
      startAt: readDateTime(json['start_at'] ?? json['startAt']),
      description: json['description']?.toString(),
      endAt: readNullableDateTime(json['end_at'] ?? json['endAt']),
      locationName: json['location_name']?.toString(),
      repeatType: json['repeat_type']?.toString() ?? 'none',
      status: json['status']?.toString() ?? 'scheduled',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      if (description != null) 'description': description,
      'start_at': startAt.toIso8601String(),
      if (endAt != null) 'end_at': endAt!.toIso8601String(),
      if (locationName != null) 'location_name': locationName,
      'repeat_type': repeatType,
      'status': status,
    };
  }
}
