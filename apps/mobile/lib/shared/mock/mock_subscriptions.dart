import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class MockSubscriptionChip {
  const MockSubscriptionChip({
    required this.label,
    required this.icon,
    required this.color,
  });

  final String label;
  final IconData icon;
  final Color color;
}

class MockSubscriptionItem {
  const MockSubscriptionItem({
    this.id,
    required this.name,
    required this.billingDay,
    required this.amount,
    required this.status,
    required this.icon,
    required this.color,
  });

  final String? id;

  final String name;
  final String billingDay;
  final String amount;
  final String status;
  final IconData icon;
  final Color color;
}

class MockUpcomingCharge {
  const MockUpcomingCharge({
    required this.name,
    required this.dueLabel,
    required this.amount,
    required this.icon,
    required this.color,
  });

  final String name;
  final String dueLabel;
  final String amount;
  final IconData icon;
  final Color color;
}

class MockSubscriptionAction {
  const MockSubscriptionAction({required this.label, required this.icon});

  final String label;
  final IconData icon;
}

class MockSubscriptionsData {
  const MockSubscriptionsData({
    required this.monthlyTotal,
    required this.monthlyLabel,
    required this.description,
    required this.chips,
    required this.subscriptions,
    required this.upcomingCharges,
    required this.quickActions,
  });

  final String monthlyTotal;
  final String monthlyLabel;
  final String description;
  final List<MockSubscriptionChip> chips;
  final List<MockSubscriptionItem> subscriptions;
  final List<MockUpcomingCharge> upcomingCharges;
  final List<MockSubscriptionAction> quickActions;
}

const mockSubscriptions = MockSubscriptionsData(
  monthlyTotal: r'$1,047',
  monthlyLabel: 'Total mensual',
  description: 'En servicios y pagos recurrentes.',
  chips: [
    MockSubscriptionChip(
      label: '4 activas',
      icon: Icons.check_circle_rounded,
      color: AppColors.finance,
    ),
    MockSubscriptionChip(
      label: 'Próximo cobro mañana',
      icon: Icons.event_repeat_rounded,
      color: AppColors.subscription,
    ),
    MockSubscriptionChip(
      label: r'$547 esta semana',
      icon: Icons.payments_rounded,
      color: AppColors.accent,
    ),
  ],
  subscriptions: [
    MockSubscriptionItem(
      name: 'Netflix',
      billingDay: 'Día 20',
      amount: r'$219',
      status: 'Activa',
      icon: Icons.movie_filter_rounded,
      color: AppColors.danger,
    ),
    MockSubscriptionItem(
      name: 'Spotify',
      billingDay: 'Día 12',
      amount: r'$129',
      status: 'Activa',
      icon: Icons.music_note_rounded,
      color: AppColors.finance,
    ),
    MockSubscriptionItem(
      name: 'iCloud',
      billingDay: 'Día 25',
      amount: r'$199',
      status: 'Activa',
      icon: Icons.cloud_rounded,
      color: AppColors.info,
    ),
    MockSubscriptionItem(
      name: 'Gym',
      billingDay: 'Día 15',
      amount: r'$500',
      status: 'Activa',
      icon: Icons.fitness_center_rounded,
      color: AppColors.calendar,
    ),
  ],
  upcomingCharges: [
    MockUpcomingCharge(
      name: 'Spotify',
      dueLabel: 'Mañana',
      amount: r'$129',
      icon: Icons.music_note_rounded,
      color: AppColors.finance,
    ),
    MockUpcomingCharge(
      name: 'Gym',
      dueLabel: '15 julio',
      amount: r'$500',
      icon: Icons.fitness_center_rounded,
      color: AppColors.calendar,
    ),
    MockUpcomingCharge(
      name: 'Netflix',
      dueLabel: '20 julio',
      amount: r'$219',
      icon: Icons.movie_filter_rounded,
      color: AppColors.danger,
    ),
  ],
  quickActions: [
    MockSubscriptionAction(
      label: '+ Suscripción',
      icon: Icons.add_card_rounded,
    ),
    MockSubscriptionAction(
      label: '+ Pago manual',
      icon: Icons.payments_rounded,
    ),
  ],
);
