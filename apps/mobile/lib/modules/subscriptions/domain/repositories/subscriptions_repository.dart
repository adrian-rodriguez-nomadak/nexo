import '../models/subscription_item.dart';

abstract class SubscriptionsRepository {
  Future<List<SubscriptionItem>> getSubscriptions();
}
