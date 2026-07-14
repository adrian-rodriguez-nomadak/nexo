import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/mock/mock_calendar.dart';
import '../domain/models/calendar_event.dart';
import '../../tasks/domain/models/task_item.dart';
import '../../reminders/domain/models/reminder_item.dart';

MockCalendarData buildCalendarViewData(
  List<CalendarEvent> events,
  List<TaskItem> tasks,
  List<ReminderItem> reminders,
) {
  return MockCalendarData(
    weekDays: mockCalendar.weekDays,
    summaryTitle: 'Hoy tienes ${events.length} eventos',
    summarySubtitle:
        '${tasks.length} tareas y ${reminders.length} recordatorios.',
    summaryChips: [
      MockCalendarChip(
        label: '${events.length} eventos',
        icon: Icons.event_available_rounded,
        color: AppColors.calendar,
      ),
      MockCalendarChip(
        label: '${tasks.length} tareas',
        icon: Icons.checklist_rounded,
        color: AppColors.task,
      ),
      MockCalendarChip(
        label: '${reminders.length} avisos',
        icon: Icons.notifications_rounded,
        color: AppColors.subscription,
      ),
    ],
    events: events.map(_eventView).toList(),
    reminders: reminders
        .map(
          (item) => MockCalendarReminder(
            id: item.id,
            title: item.title,
            icon: Icons.notifications_active_rounded,
            color: AppColors.subscription,
          ),
        )
        .toList(),
    payments: tasks
        .map(
          (item) => MockCalendarPayment(
            id: item.id,
            title: item.title,
            amount: item.priority,
            dueLabel: item.dueDate == null
                ? 'Sin fecha'
                : shortDate(item.dueDate!),
            icon: Icons.task_alt_rounded,
            color: AppColors.task,
          ),
        )
        .toList(),
    quickActions: mockCalendar.quickActions,
  );
}

MockCalendarEvent _eventView(CalendarEvent event) {
  return MockCalendarEvent(
    id: event.id,
    time: shortTime(event.startAt),
    title: event.title,
    category: event.locationName ?? 'Calendario',
    icon: Icons.calendar_today_rounded,
    color: AppColors.calendar,
  );
}
