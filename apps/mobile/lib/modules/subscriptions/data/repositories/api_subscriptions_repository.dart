import '../../../../core/http/api_client.dart';
import '../../domain/models/subscription_item.dart';
import '../../domain/repositories/subscriptions_repository.dart';

class ApiSubscriptionsRepository implements SubscriptionsRepository {
  const ApiSubscriptionsRepository({this.client = const ApiClient()});

  final ApiClient client;

  @override
  Future<List<SubscriptionItem>> getSubscriptions() async {
    final data = await client.get('/subscriptions');
    return (data as List)
        .map((item) => SubscriptionItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<SubscriptionItem> createSubscription(Map<String, dynamic> body) async {
    final data = await client.post('/subscriptions', body);
    return SubscriptionItem.fromJson(data as Map<String, dynamic>);
  }

  Future<SubscriptionItem> updateSubscription(
    String id,
    Map<String, dynamic> body,
  ) async {
    final data = await client.patch('/subscriptions/$id', body);
    return SubscriptionItem.fromJson(data as Map<String, dynamic>);
  }

  Future<SubscriptionItem> updateStatus(String id, String status) async {
    final data = await client.patch('/subscriptions/$id/status', {
      'status': status,
    });
    return SubscriptionItem.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteSubscription(String id) async {
    await client.delete('/subscriptions/$id');
  }
}
