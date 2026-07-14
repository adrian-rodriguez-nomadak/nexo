import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/mock/mock_subscriptions.dart';
import '../domain/models/subscription_item.dart';

MockSubscriptionsData buildSubscriptionsViewData(List<SubscriptionItem> items) {
  final total = items.fold<double>(0, (sum, item) => sum + item.amount);
  return MockSubscriptionsData(
    monthlyTotal: money(total),
    monthlyLabel: 'Total mensual',
    description: 'En servicios y pagos recurrentes.',
    chips: [
      MockSubscriptionChip(
        label:
            '${items.where((item) => item.status == 'active').length} activas',
        icon: Icons.check_circle_rounded,
        color: AppColors.finance,
      ),
      const MockSubscriptionChip(
        label: 'Datos locales',
        icon: Icons.cloud_done_rounded,
        color: AppColors.subscription,
      ),
      MockSubscriptionChip(
        label: '${money(total)} al mes',
        icon: Icons.payments_rounded,
        color: AppColors.accent,
      ),
    ],
    subscriptions: items.map(_subscriptionView).toList(),
    upcomingCharges: items.map(_chargeView).toList(),
    quickActions: mockSubscriptions.quickActions,
  );
}

MockSubscriptionItem _subscriptionView(SubscriptionItem item) {
  return MockSubscriptionItem(
    id: item.id,
    name: item.name,
    billingDay: 'Día ${item.billingDay}',
    amount: money(item.amount),
    status: item.status,
    icon: Icons.subscriptions_rounded,
    color: AppColors.subscription,
  );
}

MockUpcomingCharge _chargeView(SubscriptionItem item) {
  return MockUpcomingCharge(
    name: item.name,
    dueLabel: 'Día ${item.billingDay}',
    amount: money(item.amount),
    icon: Icons.event_repeat_rounded,
    color: AppColors.subscription,
  );
}
