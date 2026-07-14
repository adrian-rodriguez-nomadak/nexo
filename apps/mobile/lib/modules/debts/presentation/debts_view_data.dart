import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/mock/mock_debts.dart';
import '../domain/models/debt_item.dart';

MockDebtsData buildDebtsViewData(List<DebtItem> debts) {
  final iOwe = debts.where((item) => item.type == 'i_owe').toList();
  final owedToMe = debts.where((item) => item.type == 'they_owe_me').toList();
  final iOweTotal = iOwe.fold<double>(
    0,
    (sum, item) => sum + item.pendingAmount,
  );
  final owedTotal = owedToMe.fold<double>(
    0,
    (sum, item) => sum + item.pendingAmount,
  );
  final balance = owedTotal - iOweTotal;

  return MockDebtsData(
    balance: balance < 0 ? '-${money(balance)}' : money(balance),
    balanceLabel: 'Balance actual',
    description: 'Considerando deudas pendientes y dinero por cobrar.',
    chips: [
      MockDebtChip(
        label: '${money(iOweTotal)} debo',
        icon: Icons.arrow_upward_rounded,
        color: AppColors.danger,
      ),
      MockDebtChip(
        label: '${money(owedTotal)} me deben',
        icon: Icons.arrow_downward_rounded,
        color: AppColors.finance,
      ),
      MockDebtChip(
        label: '${debts.length} pendientes',
        icon: Icons.pending_actions_rounded,
        color: AppColors.subscription,
      ),
    ],
    iOwe: iOwe.map(_debtView).toList(),
    owedToMe: owedToMe.map(_debtView).toList(),
    quickActions: mockDebts.quickActions,
  );
}

MockDebtItem _debtView(DebtItem item) {
  return MockDebtItem(
    id: item.id,
    name: item.name,
    amount: money(item.pendingAmount),
    detail: item.dueDate == null
        ? item.status
        : 'Vence ${shortDate(item.dueDate!)}',
    icon: item.type == 'i_owe'
        ? Icons.credit_card_rounded
        : Icons.person_rounded,
    color: item.type == 'i_owe' ? AppColors.danger : AppColors.finance,
  );
}
