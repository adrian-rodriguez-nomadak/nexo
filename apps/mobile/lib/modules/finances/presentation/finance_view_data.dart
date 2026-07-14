import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/mock/mock_finances.dart';
import '../domain/models/finance_movement.dart';
import '../domain/models/finance_summary.dart';
import '../domain/models/upcoming_payment.dart';

MockFinancesData buildFinancesViewData({
  required FinanceSummary summary,
  required List<FinanceMovement> movements,
  required List<UpcomingPayment> upcomingPayments,
}) {
  return MockFinancesData(
    availableAmount: money(summary.availableAmount),
    availableLabel: 'Disponible real',
    availableDescription: 'Después de gastos y pagos próximos.',
    chips: [
      MockFinanceChip(
        label: '${money(summary.incomeTotal)} ingresos',
        icon: Icons.trending_up_rounded,
        color: AppColors.finance,
      ),
      MockFinanceChip(
        label: '${money(summary.expenseTotal)} gastos',
        icon: Icons.trending_down_rounded,
        color: AppColors.danger,
      ),
      MockFinanceChip(
        label: '${money(summary.upcomingPaymentsTotal)} pagos próximos',
        icon: Icons.payments_rounded,
        color: AppColors.subscription,
      ),
    ],
    summaryItems: [
      MockFinanceSummaryItem(
        label: 'Ingresos del mes',
        amount: money(summary.incomeTotal),
        icon: Icons.arrow_downward_rounded,
        color: AppColors.finance,
      ),
      MockFinanceSummaryItem(
        label: 'Gastos registrados',
        amount: money(summary.expenseTotal),
        icon: Icons.arrow_upward_rounded,
        color: AppColors.danger,
      ),
      MockFinanceSummaryItem(
        label: 'Pagos próximos',
        amount: money(summary.upcomingPaymentsTotal),
        icon: Icons.event_repeat_rounded,
        color: AppColors.subscription,
      ),
      MockFinanceSummaryItem(
        label: 'Recomendado por día',
        amount: money(summary.availableAmount / 14),
        icon: Icons.today_rounded,
        color: AppColors.accent,
      ),
    ],
    movements: movements.map(_movementView).toList(),
    upcomingPayments: upcomingPayments.map(_paymentView).toList(),
    moduleLinks: mockFinances.moduleLinks,
    quickActions: mockFinances.quickActions,
  );
}

MockFinanceMovement _movementView(FinanceMovement movement) {
  final isIncome = movement.type == 'income';
  return MockFinanceMovement(
    id: movement.id,
    title: movement.description ?? (isIncome ? 'Ingreso' : 'Gasto'),
    category: movement.categoryName ?? 'General',
    dateLabel: shortDate(movement.movementDate),
    amount: '${isIncome ? '+' : '-'}${money(movement.amount)}',
    icon: isIncome ? Icons.account_balance_rounded : Icons.receipt_long_rounded,
    color: isIncome ? AppColors.finance : AppColors.danger,
    isIncome: isIncome,
  );
}

MockFinancePayment _paymentView(UpcomingPayment payment) {
  return MockFinancePayment(
    id: payment.id,
    title: payment.name,
    dueLabel: shortDate(payment.dueDate),
    amount: money(payment.amount),
    icon: Icons.event_repeat_rounded,
    color: AppColors.subscription,
  );
}
