import '../../domain/models/debt_item.dart';
import '../../domain/models/debt_payment.dart';
import '../../domain/repositories/debts_repository.dart';

class MockDebtsRepository implements DebtsRepository {
  @override
  Future<List<DebtItem>> getDebts() async {
    return [
      DebtItem(
        id: 'mock-debt-1',
        name: 'Tarjeta Nu',
        type: 'i_owe',
        totalAmount: 8500,
        pendingAmount: 8500,
        dueDate: DateTime(2026, 7, 10),
      ),
    ];
  }

  @override
  Future<List<DebtPayment>> getPayments(String debtId) async {
    return [
      DebtPayment(
        id: 'mock-debt-payment-1',
        debtId: debtId,
        amount: 500,
        paymentDate: DateTime(2026, 7, 8),
      ),
    ];
  }
}
