import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class MockDashboardUser {
  const MockDashboardUser({required this.name, required this.todayLabel});

  final String name;
  final String todayLabel;
}

class MockDailySummary {
  const MockDailySummary({
    required this.availableAmount,
    required this.availableLabel,
    required this.subtitle,
    required this.chips,
  });

  final String availableAmount;
  final String availableLabel;
  final String subtitle;
  final List<MockSummaryChip> chips;
}

class MockSummaryChip {
  const MockSummaryChip({
    required this.label,
    required this.icon,
    required this.color,
  });

  final String label;
  final IconData icon;
  final Color color;
}

class MockDashboardEvent {
  const MockDashboardEvent({
    required this.title,
    required this.time,
    required this.location,
  });

  final String title;
  final String time;
  final String location;
}

class MockDashboardTask {
  const MockDashboardTask({
    this.id,
    required this.title,
    required this.detail,
    required this.done,
  });

  final String? id;
  final String title;
  final String detail;
  final bool done;
}

class MockFinanceQuickItem {
  const MockFinanceQuickItem({
    required this.amount,
    required this.label,
    required this.color,
  });

  final String amount;
  final String label;
  final Color color;
}

class MockUpcomingPayment {
  const MockUpcomingPayment({
    required this.title,
    required this.amount,
    required this.dueLabel,
    required this.color,
  });

  final String title;
  final String amount;
  final String dueLabel;
  final Color color;
}

class MockQuickAction {
  const MockQuickAction({required this.label, required this.icon});

  final String label;
  final IconData icon;
}

class MockDashboardData {
  const MockDashboardData({
    required this.user,
    required this.summary,
    required this.nextEvent,
    required this.tasks,
    required this.finances,
    required this.upcomingPayments,
    required this.quickActions,
  });

  final MockDashboardUser user;
  final MockDailySummary summary;
  final MockDashboardEvent nextEvent;
  final List<MockDashboardTask> tasks;
  final List<MockFinanceQuickItem> finances;
  final List<MockUpcomingPayment> upcomingPayments;
  final List<MockQuickAction> quickActions;
}

const mockDashboard = MockDashboardData(
  user: MockDashboardUser(name: 'Adrián', todayLabel: 'Miércoles, 8 de julio'),
  summary: MockDailySummary(
    availableAmount: r'$2,350',
    availableLabel: 'Disponible real',
    subtitle: 'Tu día se ve ordenado. Hay 3 focos importantes por atender.',
    chips: [
      MockSummaryChip(
        label: '3 pendientes',
        icon: Icons.checklist_rounded,
        color: AppColors.task,
      ),
      MockSummaryChip(
        label: '1 pago próximo',
        icon: Icons.payments_rounded,
        color: AppColors.subscription,
      ),
      MockSummaryChip(
        label: r'$330 por día',
        icon: Icons.trending_up_rounded,
        color: AppColors.finance,
      ),
    ],
  ),
  nextEvent: MockDashboardEvent(
    title: 'Revisión semanal de presupuesto',
    time: 'Hoy, 5:30 PM',
    location: 'Calendario personal',
  ),
  tasks: [
    MockDashboardTask(
      title: 'Enviar comprobante de renta',
      detail: 'Finanzas',
      done: false,
    ),
    MockDashboardTask(
      title: 'Preparar lista de compras',
      detail: 'Casa',
      done: false,
    ),
    MockDashboardTask(
      title: 'Revisar correo pendiente',
      detail: 'Inbox',
      done: true,
    ),
  ],
  finances: [
    MockFinanceQuickItem(
      amount: r'$8,420',
      label: 'Ingresos del mes',
      color: AppColors.finance,
    ),
    MockFinanceQuickItem(
      amount: r'$4,180',
      label: 'Gastos registrados',
      color: AppColors.danger,
    ),
  ],
  upcomingPayments: [
    MockUpcomingPayment(
      title: 'Spotify',
      amount: r'$129',
      dueLabel: 'Mañana',
      color: AppColors.subscription,
    ),
    MockUpcomingPayment(
      title: 'Tarjeta Nu',
      amount: r'$1,250',
      dueLabel: 'Viernes',
      color: AppColors.debt,
    ),
  ],
  quickActions: [
    MockQuickAction(label: '+ Gasto', icon: Icons.remove_circle_outline),
    MockQuickAction(label: '+ Tarea', icon: Icons.add_task_rounded),
    MockQuickAction(label: '+ Evento', icon: Icons.event_available_rounded),
    MockQuickAction(label: '+ Pago', icon: Icons.add_card_rounded),
  ],
);
