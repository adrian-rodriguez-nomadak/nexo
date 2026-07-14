import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/mock/mock_dashboard.dart';
import '../../calendar/domain/models/calendar_event.dart';
import '../../finances/domain/models/finance_summary.dart';
import '../../finances/domain/models/upcoming_payment.dart';
import '../../tasks/domain/models/task_item.dart';

MockDashboardData buildDashboardViewData({
  required String userName,
  required String todayLabel,
  required FinanceSummary? summary,
  required List<UpcomingPayment>? payments,
  required List<CalendarEvent>? events,
  required List<TaskItem>? tasks,
}) {
  final base = mockDashboard;
  final nextEvent = events == null || events.isEmpty
      ? const MockDashboardEvent(
          title: 'Sin eventos próximos',
          time: 'Agenda libre',
          location: 'Crea un evento cuando lo necesites',
        )
      : MockDashboardEvent(
          title: events.first.title,
          time: shortTime(events.first.startAt),
          location: events.first.locationName ?? 'Calendario personal',
        );

  return MockDashboardData(
    user: MockDashboardUser(name: userName, todayLabel: todayLabel),
    summary: summary == null
        ? MockDailySummary(
            availableAmount: money(0),
            availableLabel: 'Disponible real',
            subtitle: 'Agrega movimientos para construir tu resumen.',
            chips: [],
          )
        : MockDailySummary(
            availableAmount: money(summary.availableAmount),
            availableLabel: 'Disponible real',
            subtitle: 'Resumen calculado con tus datos guardados.',
            chips: [
              MockSummaryChip(
                label:
                    '${tasks?.where((task) => task.status != 'completed').length ?? 0} pendientes',
                icon: Icons.checklist_rounded,
                color: AppColors.task,
              ),
              MockSummaryChip(
                label: '${money(summary.upcomingPaymentsTotal)} pagos próximos',
                icon: base.summary.chips[1].icon,
                color: AppColors.subscription,
              ),
              MockSummaryChip(
                label: '${money(summary.availableAmount / 14)} por día',
                icon: base.summary.chips[2].icon,
                color: AppColors.finance,
              ),
            ],
          ),
    nextEvent: nextEvent,
    tasks: tasks == null
        ? const []
        : tasks
              .map(
                (task) => MockDashboardTask(
                  id: task.id,
                  title: task.title,
                  detail: task.priority,
                  done: task.status == 'completed',
                ),
              )
              .toList(),
    finances: summary == null
        ? [
            MockFinanceQuickItem(
              amount: money(0),
              label: 'Ingresos del mes',
              color: AppColors.finance,
            ),
            MockFinanceQuickItem(
              amount: money(0),
              label: 'Gastos registrados',
              color: AppColors.danger,
            ),
          ]
        : [
            MockFinanceQuickItem(
              amount: money(summary.incomeTotal),
              label: 'Ingresos del mes',
              color: AppColors.finance,
            ),
            MockFinanceQuickItem(
              amount: money(summary.expenseTotal),
              label: 'Gastos registrados',
              color: AppColors.danger,
            ),
          ],
    upcomingPayments: payments == null
        ? const []
        : payments
              .map(
                (payment) => MockUpcomingPayment(
                  title: payment.name,
                  amount: money(payment.amount),
                  dueLabel: shortDate(payment.dueDate),
                  color: AppColors.subscription,
                ),
              )
              .toList(),
    quickActions: base.quickActions,
  );
}
