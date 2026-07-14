class FinanceBudget {
  const FinanceBudget({
    required this.id,
    required this.category,
    required this.limit,
    required this.spent,
  });

  final String id;
  final String category;
  final double limit;
  final double spent;

  double get remaining => limit - spent;
  double get progress => limit <= 0 ? 0 : (spent / limit).clamp(0, 1);
  bool get exceeded => spent > limit;
}
