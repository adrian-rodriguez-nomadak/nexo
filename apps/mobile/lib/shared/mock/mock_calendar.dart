import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class MockCalendarDay {
  const MockCalendarDay({
    required this.weekday,
    required this.day,
    this.isSelected = false,
  });

  final String weekday;
  final String day;
  final bool isSelected;
}

class MockCalendarChip {
  const MockCalendarChip({
    required this.label,
    required this.icon,
    required this.color,
  });

  final String label;
  final IconData icon;
  final Color color;
}

class MockCalendarEvent {
  const MockCalendarEvent({
    this.id,
    required this.time,
    required this.title,
    required this.category,
    required this.icon,
    required this.color,
  });

  final String? id;

  final String time;
  final String title;
  final String category;
  final IconData icon;
  final Color color;
}

class MockCalendarReminder {
  const MockCalendarReminder({
    this.id,
    required this.title,
    required this.icon,
    required this.color,
  });

  final String? id;

  final String title;
  final IconData icon;
  final Color color;
}

class MockCalendarPayment {
  const MockCalendarPayment({
    this.id,
    required this.title,
    required this.amount,
    required this.dueLabel,
    required this.icon,
    required this.color,
  });

  final String? id;

  final String title;
  final String amount;
  final String dueLabel;
  final IconData icon;
  final Color color;
}

class MockCalendarAction {
  const MockCalendarAction({required this.label, required this.icon});

  final String label;
  final IconData icon;
}

class MockCalendarData {
  const MockCalendarData({
    required this.weekDays,
    required this.summaryTitle,
    required this.summarySubtitle,
    required this.summaryChips,
    required this.events,
    required this.reminders,
    required this.payments,
    required this.quickActions,
  });

  final List<MockCalendarDay> weekDays;
  final String summaryTitle;
  final String summarySubtitle;
  final List<MockCalendarChip> summaryChips;
  final List<MockCalendarEvent> events;
  final List<MockCalendarReminder> reminders;
  final List<MockCalendarPayment> payments;
  final List<MockCalendarAction> quickActions;
}

const mockCalendar = MockCalendarData(
  weekDays: [
    MockCalendarDay(weekday: 'Lun', day: '8'),
    MockCalendarDay(weekday: 'Mar', day: '9'),
    MockCalendarDay(weekday: 'Mié', day: '10', isSelected: true),
    MockCalendarDay(weekday: 'Jue', day: '11'),
    MockCalendarDay(weekday: 'Vie', day: '12'),
    MockCalendarDay(weekday: 'Sáb', day: '13'),
    MockCalendarDay(weekday: 'Dom', day: '14'),
  ],
  summaryTitle: 'Hoy tienes 3 eventos',
  summarySubtitle: '2 tareas pendientes y 1 pago programado.',
  summaryChips: [
    MockCalendarChip(
      label: '3 eventos',
      icon: Icons.event_available_rounded,
      color: AppColors.calendar,
    ),
    MockCalendarChip(
      label: '2 tareas',
      icon: Icons.checklist_rounded,
      color: AppColors.task,
    ),
    MockCalendarChip(
      label: '1 pago',
      icon: Icons.payments_rounded,
      color: AppColors.subscription,
    ),
  ],
  events: [
    MockCalendarEvent(
      time: '9:00 AM',
      title: 'Reunión semanal',
      category: 'Trabajo',
      icon: Icons.groups_rounded,
      color: AppColors.info,
    ),
    MockCalendarEvent(
      time: '3:00 PM',
      title: 'Pagar tarjeta',
      category: 'Finanzas',
      icon: Icons.credit_card_rounded,
      color: AppColors.finance,
    ),
    MockCalendarEvent(
      time: '7:00 PM',
      title: 'Gimnasio',
      category: 'Salud',
      icon: Icons.fitness_center_rounded,
      color: AppColors.calendar,
    ),
  ],
  reminders: [
    MockCalendarReminder(
      title: 'Comprar proteína',
      icon: Icons.shopping_bag_rounded,
      color: AppColors.habit,
    ),
    MockCalendarReminder(
      title: 'Enviar comprobante',
      icon: Icons.upload_file_rounded,
      color: AppColors.task,
    ),
    MockCalendarReminder(
      title: 'Revisar presupuesto',
      icon: Icons.account_balance_wallet_rounded,
      color: AppColors.finance,
    ),
  ],
  payments: [
    MockCalendarPayment(
      title: 'Spotify',
      amount: r'$129',
      dueLabel: 'Mañana',
      icon: Icons.subscriptions_rounded,
      color: AppColors.subscription,
    ),
    MockCalendarPayment(
      title: 'Tarjeta Nu',
      amount: r'$1,250',
      dueLabel: 'Viernes',
      icon: Icons.credit_card_rounded,
      color: AppColors.debt,
    ),
  ],
  quickActions: [
    MockCalendarAction(label: '+ Evento', icon: Icons.event_available_rounded),
    MockCalendarAction(
      label: '+ Recordatorio',
      icon: Icons.notifications_active_rounded,
    ),
    MockCalendarAction(label: '+ Tarea', icon: Icons.add_task_rounded),
  ],
);
