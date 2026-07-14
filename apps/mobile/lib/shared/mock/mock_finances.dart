import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class MockFinanceChip {
  const MockFinanceChip({
    required this.label,
    required this.icon,
    required this.color,
  });

  final String label;
  final IconData icon;
  final Color color;
}

class MockFinanceSummaryItem {
  const MockFinanceSummaryItem({
    required this.label,
    required this.amount,
    required this.icon,
    required this.color,
  });

  final String label;
  final String amount;
  final IconData icon;
  final Color color;
}

class MockFinanceMovement {
  const MockFinanceMovement({
    this.id,
    required this.title,
    required this.category,
    required this.dateLabel,
    required this.amount,
    required this.icon,
    required this.color,
    required this.isIncome,
  });

  final String? id;
  final String title;
  final String category;
  final String dateLabel;
  final String amount;
  final IconData icon;
  final Color color;
  final bool isIncome;
}

class MockFinancePayment {
  const MockFinancePayment({
    this.id,
    required this.title,
    required this.dueLabel,
    required this.amount,
    required this.icon,
    required this.color,
  });

  final String? id;
  final String title;
  final String dueLabel;
  final String amount;
  final IconData icon;
  final Color color;
}

class MockFinanceModuleLink {
  const MockFinanceModuleLink({
    required this.title,
    required this.subtitle,
    required this.route,
    required this.icon,
    required this.color,
  });

  final String title;
  final String subtitle;
  final String route;
  final IconData icon;
  final Color color;
}

class MockFinanceAction {
  const MockFinanceAction({required this.label, required this.icon});

  final String label;
  final IconData icon;
}

class MockFinancesData {
  const MockFinancesData({
    required this.availableAmount,
    required this.availableLabel,
    required this.availableDescription,
    required this.chips,
    required this.summaryItems,
    required this.movements,
    required this.upcomingPayments,
    required this.moduleLinks,
    required this.quickActions,
  });

  final String availableAmount;
  final String availableLabel;
  final String availableDescription;
  final List<MockFinanceChip> chips;
  final List<MockFinanceSummaryItem> summaryItems;
  final List<MockFinanceMovement> movements;
  final List<MockFinancePayment> upcomingPayments;
  final List<MockFinanceModuleLink> moduleLinks;
  final List<MockFinanceAction> quickActions;
}

const mockFinances = MockFinancesData(
  availableAmount: r'$2,350',
  availableLabel: 'Disponible real',
  availableDescription: 'Después de gastos y pagos próximos.',
  chips: [
    MockFinanceChip(
      label: r'$8,420 ingresos',
      icon: Icons.trending_up_rounded,
      color: AppColors.finance,
    ),
    MockFinanceChip(
      label: r'$4,180 gastos',
      icon: Icons.trending_down_rounded,
      color: AppColors.danger,
    ),
    MockFinanceChip(
      label: r'$1,379 pagos próximos',
      icon: Icons.payments_rounded,
      color: AppColors.subscription,
    ),
  ],
  summaryItems: [
    MockFinanceSummaryItem(
      label: 'Ingresos del mes',
      amount: r'$8,420',
      icon: Icons.arrow_downward_rounded,
      color: AppColors.finance,
    ),
    MockFinanceSummaryItem(
      label: 'Gastos registrados',
      amount: r'$4,180',
      icon: Icons.arrow_upward_rounded,
      color: AppColors.danger,
    ),
    MockFinanceSummaryItem(
      label: 'Pagos próximos',
      amount: r'$1,379',
      icon: Icons.event_repeat_rounded,
      color: AppColors.subscription,
    ),
    MockFinanceSummaryItem(
      label: 'Recomendado por día',
      amount: r'$330',
      icon: Icons.today_rounded,
      color: AppColors.accent,
    ),
  ],
  movements: [
    MockFinanceMovement(
      title: 'Gasto en comida',
      category: 'Alimentos',
      dateLabel: 'Hoy',
      amount: r'-$180',
      icon: Icons.restaurant_rounded,
      color: AppColors.danger,
      isIncome: false,
    ),
    MockFinanceMovement(
      title: 'Spotify',
      category: 'Suscripción',
      dateLabel: 'Ayer',
      amount: r'-$129',
      icon: Icons.subscriptions_rounded,
      color: AppColors.danger,
      isIncome: false,
    ),
    MockFinanceMovement(
      title: 'Ingreso nómina',
      category: 'Trabajo',
      dateLabel: 'Lun',
      amount: r'+$2,000',
      icon: Icons.account_balance_rounded,
      color: AppColors.finance,
      isIncome: true,
    ),
    MockFinanceMovement(
      title: 'Gasolina',
      category: 'Transporte',
      dateLabel: 'Dom',
      amount: r'-$500',
      icon: Icons.local_gas_station_rounded,
      color: AppColors.danger,
      isIncome: false,
    ),
  ],
  upcomingPayments: [
    MockFinancePayment(
      title: 'Spotify',
      dueLabel: 'Mañana',
      amount: r'$129',
      icon: Icons.subscriptions_rounded,
      color: AppColors.subscription,
    ),
    MockFinancePayment(
      title: 'Tarjeta Nu',
      dueLabel: 'Viernes',
      amount: r'$1,250',
      icon: Icons.credit_card_rounded,
      color: AppColors.debt,
    ),
    MockFinancePayment(
      title: 'Internet',
      dueLabel: '25 julio',
      amount: r'$599',
      icon: Icons.wifi_rounded,
      color: AppColors.info,
    ),
  ],
  moduleLinks: [
    MockFinanceModuleLink(
      title: 'Suscripciones',
      subtitle: 'Pagos recurrentes',
      route: '/subscriptions',
      icon: Icons.subscriptions_rounded,
      color: AppColors.subscription,
    ),
    MockFinanceModuleLink(
      title: 'Deudas',
      subtitle: 'Cobros y pagos pendientes',
      route: '/debts',
      icon: Icons.receipt_long_rounded,
      color: AppColors.debt,
    ),
  ],
  quickActions: [
    MockFinanceAction(label: '+ Gasto', icon: Icons.remove_circle_outline),
    MockFinanceAction(label: '+ Ingreso', icon: Icons.add_circle_outline),
    MockFinanceAction(label: '+ Pago', icon: Icons.add_card_rounded),
    MockFinanceAction(label: '+ Deuda', icon: Icons.note_add_rounded),
  ],
);
