import '../../domain/models/finance_movement.dart';
import '../../domain/models/finance_summary.dart';
import '../../domain/models/upcoming_payment.dart';
import '../../domain/repositories/finances_repository.dart';

class MockFinancesRepository implements FinancesRepository {
  @override
  Future<FinanceSummary> getSummary() async {
    return const FinanceSummary(
      availableAmount: 2350,
      incomeTotal: 2000,
      expenseTotal: 850,
      upcomingPaymentsTotal: 1978,
    );
  }

  @override
  Future<List<FinanceMovement>> getMovements() async {
    return [
      FinanceMovement(
        id: 'mock-expense-1',
        type: 'expense',
        amount: 180,
        movementDate: DateTime(2026, 7, 8),
        description: 'Comida',
        paymentMethod: 'card',
      ),
    ];
  }

  @override
  Future<List<UpcomingPayment>> getUpcomingPayments() async {
    return [
      UpcomingPayment(
        id: 'mock-payment-1',
        name: 'Spotify',
        amount: 129,
        dueDate: DateTime(2026, 7, 9),
        category: 'Suscripción',
      ),
    ];
  }
}
