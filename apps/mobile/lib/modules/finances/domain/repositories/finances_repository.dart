import '../models/finance_movement.dart';
import '../models/finance_summary.dart';
import '../models/upcoming_payment.dart';

abstract class FinancesRepository {
  Future<FinanceSummary> getSummary();
  Future<List<FinanceMovement>> getMovements();
  Future<List<UpcomingPayment>> getUpcomingPayments();
}
