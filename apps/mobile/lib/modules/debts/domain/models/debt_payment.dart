import '../../../../core/utils/json_read.dart';

class DebtPayment {
  const DebtPayment({
    required this.id,
    required this.debtId,
    required this.amount,
    required this.paymentDate,
    this.notes,
  });

  final String id;
  final String debtId;
  final double amount;
  final DateTime paymentDate;
  final String? notes;

  factory DebtPayment.fromJson(Map<String, dynamic> json) {
    return DebtPayment(
      id: json['id'].toString(),
      debtId: json['debt_id']?.toString() ?? json['debtId']?.toString() ?? '',
      amount: readDouble(json['amount']),
      paymentDate: readDateTime(json['payment_date'] ?? json['paymentDate']),
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'debt_id': debtId,
      'amount': amount,
      'payment_date': paymentDate.toIso8601String().split('T').first,
      if (notes != null) 'notes': notes,
    };
  }
}
