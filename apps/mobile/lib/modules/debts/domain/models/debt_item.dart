import '../../../../core/utils/json_read.dart';

class DebtItem {
  const DebtItem({
    required this.id,
    required this.name,
    required this.type,
    required this.totalAmount,
    required this.pendingAmount,
    this.dueDate,
    this.status = 'pending',
    this.notes,
  });

  final String id;
  final String name;
  final String type;
  final double totalAmount;
  final double pendingAmount;
  final DateTime? dueDate;
  final String status;
  final String? notes;

  factory DebtItem.fromJson(Map<String, dynamic> json) {
    return DebtItem(
      id: json['id'].toString(),
      name: json['name']?.toString() ?? '',
      type: json['type']?.toString() ?? 'i_owe',
      totalAmount: readDouble(json['total_amount'] ?? json['totalAmount']),
      pendingAmount: readDouble(
        json['pending_amount'] ?? json['pendingAmount'],
      ),
      dueDate: readNullableDateTime(json['due_date'] ?? json['dueDate']),
      status: json['status']?.toString() ?? 'pending',
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'total_amount': totalAmount,
      'pending_amount': pendingAmount,
      if (dueDate != null)
        'due_date': dueDate!.toIso8601String().split('T').first,
      'status': status,
      if (notes != null) 'notes': notes,
    };
  }
}
