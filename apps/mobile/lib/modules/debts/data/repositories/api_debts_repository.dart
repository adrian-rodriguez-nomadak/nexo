import '../../../../core/http/api_client.dart';
import '../../domain/models/debt_item.dart';
import '../../domain/models/debt_payment.dart';
import '../../domain/repositories/debts_repository.dart';

class ApiDebtsRepository implements DebtsRepository {
  const ApiDebtsRepository({this.client = const ApiClient()});

  final ApiClient client;

  @override
  Future<List<DebtItem>> getDebts() async {
    final data = await client.get('/debts');
    return (data as List)
        .map((item) => DebtItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<List<DebtPayment>> getPayments(String debtId) {
    return Future.value(const []);
  }

  Future<DebtItem> createDebt(Map<String, dynamic> body) async {
    final data = await client.post('/debts', body);
    return DebtItem.fromJson(data as Map<String, dynamic>);
  }

  Future<DebtItem> updateDebt(String id, Map<String, dynamic> body) async {
    final data = await client.patch('/debts/$id', body);
    return DebtItem.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteDebt(String id) async {
    await client.delete('/debts/$id');
  }

  Future<DebtPayment> createPayment(
    String debtId,
    Map<String, dynamic> body,
  ) async {
    final data = await client.post('/debts/$debtId/payments', body);
    final payment = (data as Map<String, dynamic>)['payment'];
    return DebtPayment.fromJson(payment as Map<String, dynamic>);
  }
}
