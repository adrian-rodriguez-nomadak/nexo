import '../../domain/models/subscription_item.dart';
import '../../domain/repositories/subscriptions_repository.dart';

class MockSubscriptionsRepository implements SubscriptionsRepository {
  @override
  Future<List<SubscriptionItem>> getSubscriptions() async {
    return const [
      SubscriptionItem(
        id: 'mock-subscription-1',
        name: 'Spotify',
        amount: 129,
        billingDay: 12,
        category: 'Entretenimiento',
      ),
    ];
  }
}
