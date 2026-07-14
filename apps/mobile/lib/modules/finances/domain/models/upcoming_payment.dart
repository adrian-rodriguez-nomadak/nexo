import '../../../../core/utils/json_read.dart';

class UpcomingPayment {
  const UpcomingPayment({
    required this.id,
    required this.name,
    required this.amount,
    required this.dueDate,
    this.category,
    this.status = 'pending',
    this.repeatType = 'none',
    this.notes,
  });

  final String id;
  final String name;
  final double amount;
  final DateTime dueDate;
  final String? category;
  final String status;
  final String repeatType;
  final String? notes;

  factory UpcomingPayment.fromJson(Map<String, dynamic> json) {
    return UpcomingPayment(
      id: json['id'].toString(),
      name: json['name']?.toString() ?? '',
      amount: readDouble(json['amount']),
      dueDate: readDateTime(json['due_date'] ?? json['dueDate']),
      category: json['category']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      repeatType: json['repeat_type']?.toString() ?? 'none',
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'amount': amount,
      'due_date': dueDate.toIso8601String().split('T').first,
      if (category != null) 'category': category,
      'status': status,
      'repeat_type': repeatType,
      if (notes != null) 'notes': notes,
    };
  }
}
