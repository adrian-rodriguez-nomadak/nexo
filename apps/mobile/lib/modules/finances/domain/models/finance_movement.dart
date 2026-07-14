import '../../../../core/utils/json_read.dart';

class FinanceMovement {
  const FinanceMovement({
    required this.id,
    required this.type,
    required this.amount,
    required this.movementDate,
    this.categoryId,
    this.categoryName,
    this.description,
    this.paymentMethod,
  });

  final String id;
  final String type;
  final double amount;
  final DateTime movementDate;
  final String? categoryId;
  final String? categoryName;
  final String? description;
  final String? paymentMethod;

  factory FinanceMovement.fromJson(Map<String, dynamic> json) {
    return FinanceMovement(
      id: json['id'].toString(),
      type: json['type']?.toString() ?? 'expense',
      amount: readDouble(json['amount']),
      movementDate: readDateTime(json['movement_date'] ?? json['movementDate']),
      categoryId: json['category_id']?.toString(),
      categoryName: json['category_name']?.toString(),
      description: json['description']?.toString(),
      paymentMethod: json['payment_method']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'amount': amount,
      'movement_date': movementDate.toIso8601String().split('T').first,
      if (categoryId != null) 'category_id': categoryId,
      if (categoryName != null) 'category_name': categoryName,
      if (description != null) 'description': description,
      if (paymentMethod != null) 'payment_method': paymentMethod,
    };
  }
}
