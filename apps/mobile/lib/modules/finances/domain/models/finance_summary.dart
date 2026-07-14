import '../../../../core/utils/json_read.dart';

class FinanceSummary {
  const FinanceSummary({
    required this.availableAmount,
    required this.incomeTotal,
    required this.expenseTotal,
    required this.upcomingPaymentsTotal,
  });

  final double availableAmount;
  final double incomeTotal;
  final double expenseTotal;
  final double upcomingPaymentsTotal;

  factory FinanceSummary.fromJson(Map<String, dynamic> json) {
    return FinanceSummary(
      availableAmount: readDouble(
        json['availableReal'] ?? json['availableAmount'],
      ),
      incomeTotal: readDouble(json['totalIncome'] ?? json['incomeTotal']),
      expenseTotal: readDouble(json['totalExpenses'] ?? json['expenseTotal']),
      upcomingPaymentsTotal: readDouble(
        json['upcomingPayments'] ?? json['upcomingPaymentsTotal'],
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'availableAmount': availableAmount,
      'incomeTotal': incomeTotal,
      'expenseTotal': expenseTotal,
      'upcomingPaymentsTotal': upcomingPaymentsTotal,
    };
  }
}
