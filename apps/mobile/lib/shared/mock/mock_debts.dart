import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class MockDebtChip {
  const MockDebtChip({
    required this.label,
    required this.icon,
    required this.color,
  });

  final String label;
  final IconData icon;
  final Color color;
}

class MockDebtItem {
  const MockDebtItem({
    this.id,
    required this.name,
    required this.amount,
    required this.detail,
    required this.icon,
    required this.color,
  });

  final String? id;

  final String name;
  final String amount;
  final String detail;
  final IconData icon;
  final Color color;
}

class MockDebtAction {
  const MockDebtAction({required this.label, required this.icon});

  final String label;
  final IconData icon;
}

class MockDebtsData {
  const MockDebtsData({
    required this.balance,
    required this.balanceLabel,
    required this.description,
    required this.chips,
    required this.iOwe,
    required this.owedToMe,
    required this.quickActions,
  });

  final String balance;
  final String balanceLabel;
  final String description;
  final List<MockDebtChip> chips;
  final List<MockDebtItem> iOwe;
  final List<MockDebtItem> owedToMe;
  final List<MockDebtAction> quickActions;
}

const mockDebts = MockDebtsData(
  balance: r'-$10,000',
  balanceLabel: 'Balance actual',
  description: 'Considerando deudas pendientes y dinero por cobrar.',
  chips: [
    MockDebtChip(
      label: r'$11,700 debo',
      icon: Icons.arrow_upward_rounded,
      color: AppColors.danger,
    ),
    MockDebtChip(
      label: r'$1,700 me deben',
      icon: Icons.arrow_downward_rounded,
      color: AppColors.finance,
    ),
    MockDebtChip(
      label: '4 pendientes',
      icon: Icons.pending_actions_rounded,
      color: AppColors.subscription,
    ),
  ],
  iOwe: [
    MockDebtItem(
      name: 'Tarjeta Nu',
      amount: r'$8,500',
      detail: 'Pago próximo viernes',
      icon: Icons.credit_card_rounded,
      color: AppColors.danger,
    ),
    MockDebtItem(
      name: 'Laptop MSI',
      amount: r'$3,200',
      detail: '3 pagos restantes',
      icon: Icons.laptop_mac_rounded,
      color: AppColors.debt,
    ),
  ],
  owedToMe: [
    MockDebtItem(
      name: 'Carlos',
      amount: r'$500',
      detail: 'Desde 5 julio',
      icon: Icons.person_rounded,
      color: AppColors.finance,
    ),
    MockDebtItem(
      name: 'Juan',
      amount: r'$1,200',
      detail: 'Desde 1 julio',
      icon: Icons.person_rounded,
      color: AppColors.finance,
    ),
  ],
  quickActions: [
    MockDebtAction(label: '+ Deuda', icon: Icons.note_add_rounded),
    MockDebtAction(label: '+ Me deben', icon: Icons.savings_rounded),
    MockDebtAction(label: '+ Pago', icon: Icons.payments_rounded),
  ],
);
