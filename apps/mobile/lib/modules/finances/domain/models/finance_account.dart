class FinanceAccount {
  const FinanceAccount({
    required this.id,
    required this.name,
    required this.type,
    required this.initialBalance,
    required this.currentBalance,
  });

  final String id;
  final String name;
  final String type;
  final double initialBalance;
  final double currentBalance;
}
