import '../../../../core/http/api_client.dart';
import '../../domain/models/finance_movement.dart';
import '../../domain/models/finance_summary.dart';
import '../../domain/models/upcoming_payment.dart';
import '../../domain/repositories/finances_repository.dart';

class ApiFinancesRepository implements FinancesRepository {
  const ApiFinancesRepository({this.client = const ApiClient()});

  final ApiClient client;

  @override
  Future<FinanceSummary> getSummary() async {
    final data = await client.get('/finances/summary');
    return FinanceSummary.fromJson(data as Map<String, dynamic>);
  }

  @override
  Future<List<FinanceMovement>> getMovements() async {
    final data = await client.get('/finances/movements');
    return (data as List)
        .map((item) => FinanceMovement.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<List<UpcomingPayment>> getUpcomingPayments() async {
    final data = await client.get('/finances/upcoming-payments');
    return (data as List)
        .map((item) => UpcomingPayment.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<FinanceMovement> createMovement(Map<String, dynamic> body) async {
    final data = await client.post('/finances/movements', body);
    return FinanceMovement.fromJson(data as Map<String, dynamic>);
  }

  Future<UpcomingPayment> createUpcomingPayment(
    Map<String, dynamic> body,
  ) async {
    final data = await client.post('/finances/upcoming-payments', body);
    return UpcomingPayment.fromJson(data as Map<String, dynamic>);
  }
}
