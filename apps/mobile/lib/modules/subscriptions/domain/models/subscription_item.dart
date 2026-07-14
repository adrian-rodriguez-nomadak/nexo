import '../../../../core/utils/json_read.dart';

class SubscriptionItem {
  const SubscriptionItem({
    required this.id,
    required this.name,
    required this.amount,
    required this.billingDay,
    this.frequency = 'monthly',
    this.category,
    this.status = 'active',
    this.notes,
  });

  final String id;
  final String name;
  final double amount;
  final int billingDay;
  final String frequency;
  final String? category;
  final String status;
  final String? notes;

  factory SubscriptionItem.fromJson(Map<String, dynamic> json) {
    return SubscriptionItem(
      id: json['id'].toString(),
      name: json['name']?.toString() ?? '',
      amount: readDouble(json['amount']),
      billingDay: readInt(json['billing_day'] ?? json['billingDay']),
      frequency: json['frequency']?.toString() ?? 'monthly',
      category: json['category']?.toString(),
      status: json['status']?.toString() ?? 'active',
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'amount': amount,
      'billing_day': billingDay,
      'frequency': frequency,
      if (category != null) 'category': category,
      'status': status,
      if (notes != null) 'notes': notes,
    };
  }
}
