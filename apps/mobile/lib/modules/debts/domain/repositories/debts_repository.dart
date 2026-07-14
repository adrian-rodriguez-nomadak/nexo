import '../models/debt_item.dart';
import '../models/debt_payment.dart';

abstract class DebtsRepository {
  Future<List<DebtItem>> getDebts();
  Future<List<DebtPayment>> getPayments(String debtId);
}
