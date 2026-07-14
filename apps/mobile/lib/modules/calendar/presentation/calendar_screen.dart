import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../application/calendar_providers.dart';
import '../../tasks/application/tasks_providers.dart';
import '../../reminders/application/reminders_providers.dart';
import '../data/repositories/local_calendar_repository.dart';
import '../../tasks/data/repositories/local_tasks_repository.dart';
import '../../reminders/data/repositories/local_reminders_repository.dart';
import '../../../shared/mock/mock_calendar.dart';
import '../../../shared/presentation/widgets/app_back_button.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/quick_action_button.dart';
import '../../../shared/presentation/widgets/section_header.dart';
import '../../../shared/presentation/widgets/summary_chip.dart';
import '../../../shared/presentation/widgets/empty_state_card.dart';
import 'widgets/calendar_item_detail_sheet.dart';
import 'widgets/create_event_sheet.dart';
import 'widgets/create_reminder_sheet.dart';
import 'widgets/create_task_sheet.dart';
import 'calendar_view_data.dart';

class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});

  void _showSimulatedAction(BuildContext context, String label) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('$label simulado')));
  }

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  void _openCreateEventSheet(BuildContext context, WidgetRef ref) {
    CreateEventSheet.show(
      context: context,
      onSave: (draft) => _saveEvent(context, ref, draft),
    );
  }

  void _openCreateReminderSheet(BuildContext context, WidgetRef ref) {
    CreateReminderSheet.show(
      context: context,
      onSave: (draft) => _saveReminder(context, ref, draft),
    );
  }

  void _openCreateTaskSheet(BuildContext context, WidgetRef ref) {
    CreateTaskSheet.show(
      context: context,
      onSave: (draft) => _saveTask(context, ref, draft),
    );
  }

  void _openCalendarDetail(
    BuildContext context,
    CalendarItemDetailSheet sheet,
  ) {
    CalendarItemDetailSheet.show(context: context, sheet: sheet);
  }

  Future<void> _saveEvent(
    BuildContext context,
    WidgetRef ref,
    EventDraft draft,
  ) async {
    final repository = ref.read(calendarRepositoryProvider);
    if (repository is! LocalCalendarRepository) {
      _showSnackBar(context, 'Evento simulado guardado');
      return;
    }

    try {
      await repository.createEvent(
        title: draft.title,
        locationName: draft.location,
        description: draft.description,
        startAt: draft.startAt,
        endAt: draft.endAt,
      );
      if (!context.mounted) return;
      ref.invalidate(calendarEventsProvider);
      _showSnackBar(context, 'Guardado localmente');
    } catch (_) {
      _showSnackBar(context, 'No se pudo guardar localmente');
    }
  }

  Future<void> _saveTask(
    BuildContext context,
    WidgetRef ref,
    TaskDraft draft,
  ) async {
    final repository = ref.read(tasksRepositoryProvider);
    if (repository is! LocalTasksRepository) {
      _showSnackBar(context, 'Tarea simulada guardada');
      return;
    }

    try {
      await repository.createTask(
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
      );
      if (!context.mounted) return;
      ref.invalidate(tasksProvider);
      _showSnackBar(context, 'Guardado localmente');
    } catch (_) {
      _showSnackBar(context, 'No se pudo guardar localmente');
    }
  }

  Future<void> _saveReminder(
    BuildContext context,
    WidgetRef ref,
    ReminderDraft draft,
  ) async {
    final repository = ref.read(remindersRepositoryProvider);
    if (repository is! LocalRemindersRepository) {
      _showSnackBar(context, 'Recordatorio simulado guardado');
      return;
    }

    try {
      await repository.createReminder(
        title: draft.title,
        description: draft.description,
        remindAt: draft.remindAt,
      );
      if (!context.mounted) return;
      ref.invalidate(remindersProvider);
      _showSnackBar(context, 'Guardado localmente');
    } catch (_) {
      _showSnackBar(context, 'No se pudo guardar localmente');
    }
  }

  Future<void> _handleEventAction(
    BuildContext context,
    WidgetRef ref,
    String? id,
    String action,
  ) async {
    final repository = ref.read(calendarRepositoryProvider);
    if (id == null || repository is! LocalCalendarRepository) return;
    if (action == 'delete') {
      Navigator.of(context).pop();
      await repository.deleteEvent(id);
      ref.invalidate(calendarEventsProvider);
      if (context.mounted) _showSnackBar(context, 'Evento eliminado');
      return;
    }
    if (action == 'primary' || action == 'extra') {
      Navigator.of(context).pop();
      final source = ref
          .read(calendarEventsProvider)
          .value
          ?.where((value) => value.id == id)
          .firstOrNull;
      if (source != null && context.mounted) {
        await CreateEventSheet.show(
          context: context,
          initialDraft: EventDraft(
            title: source.title,
            location: source.locationName ?? '',
            description: source.description ?? '',
            startAt: source.startAt,
            endAt: source.endAt,
          ),
          onSave: (draft) async {
            await repository.updateEvent(
              id: id,
              title: draft.title,
              locationName: draft.location,
              description: draft.description,
              startAt: draft.startAt,
              endAt: draft.endAt,
            );
            ref.invalidate(calendarEventsProvider);
          },
        );
      }
    }
  }

  Future<void> _handleReminderAction(
    BuildContext context,
    WidgetRef ref,
    String? id,
    String action,
  ) async {
    final repository = ref.read(remindersRepositoryProvider);
    if (id == null || repository is! LocalRemindersRepository) return;
    Navigator.of(context).pop();
    if (action == 'delete') await repository.deleteReminder(id);
    if (action == 'primary') await repository.updateStatus(id, 'completed');
    if (action == 'extra') {
      final source = ref
          .read(remindersProvider)
          .value
          ?.where((value) => value.id == id)
          .firstOrNull;
      if (source != null && context.mounted) {
        await CreateReminderSheet.show(
          context: context,
          initialDraft: ReminderDraft(
            title: source.title,
            description: source.description ?? '',
            remindAt: source.remindAt,
          ),
          onSave: (draft) async {
            await repository.updateReminder(
              id: id,
              title: draft.title,
              description: draft.description,
              remindAt: draft.remindAt,
            );
            ref.invalidate(remindersProvider);
          },
        );
      }
      return;
    }
    ref.invalidate(remindersProvider);
    if (context.mounted) {
      _showSnackBar(
        context,
        action == 'delete'
            ? 'Recordatorio eliminado'
            : 'Recordatorio actualizado',
      );
    }
  }

  Future<void> _handleTaskAction(
    BuildContext context,
    WidgetRef ref,
    String? id,
    String action,
  ) async {
    final repository = ref.read(tasksRepositoryProvider);
    if (id == null || repository is! LocalTasksRepository) return;
    Navigator.of(context).pop();
    if (action == 'delete') await repository.deleteTask(id);
    if (action == 'primary') await repository.updateStatus(id, 'completed');
    if (action == 'extra') {
      final source = ref
          .read(tasksProvider)
          .value
          ?.where((value) => value.id == id)
          .firstOrNull;
      if (source != null && context.mounted) {
        await CreateTaskSheet.show(
          context: context,
          initialDraft: TaskDraft(
            title: source.title,
            description: source.description ?? '',
            priority: source.priority,
          ),
          onSave: (draft) async {
            await repository.updateTask(
              id: id,
              title: draft.title,
              description: draft.description,
              priority: draft.priority,
            );
            ref.invalidate(tasksProvider);
          },
        );
      }
      return;
    }
    ref.invalidate(tasksProvider);
    if (context.mounted) {
      _showSnackBar(
        context,
        action == 'delete' ? 'Tarea eliminada' : 'Tarea actualizada',
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = ref.watch(calendarEventsProvider);
    final tasks = ref.watch(tasksProvider);
    final reminders = ref.watch(remindersProvider);
    final data = events.value == null
        ? mockCalendar
        : buildCalendarViewData(
            events.value!,
            tasks.value ?? const [],
            reminders.value ?? const [],
          );
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.lg,
            AppSpacing.screenPadding,
            150,
          ),
          children: [
            Row(
              children: [
                const AppBackButton(),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Calendario', style: textTheme.headlineLarge),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Agenda tu día, tareas y recordatorios.',
                        style: textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const ModuleBadge(
                  icon: Icons.calendar_today_rounded,
                  color: AppColors.primaryDark,
                  backgroundColor: AppColors.primary,
                  size: 48,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            _WeekSelector(days: data.weekDays),
            const SizedBox(height: AppSpacing.xxl),
            if (events.isLoading) ...[
              const Center(child: CircularProgressIndicator()),
              const SizedBox(height: AppSpacing.xl),
            ],
            if (events.hasError) ...[
              const AppCard(child: Text('Usando datos de prototipo')),
              const SizedBox(height: AppSpacing.xl),
            ],
            _DaySummaryCard(data: data),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Agenda de hoy'),
            const SizedBox(height: AppSpacing.md),
            _AgendaList(
              events: data.events,
              onEventTap: (event) => _openCalendarDetail(
                context,
                CalendarItemDetailSheet(
                  title: event.title,
                  type: 'Evento',
                  icon: event.icon,
                  color: event.color,
                  date: 'Hoy',
                  time: event.time,
                  category: event.category,
                  notes: 'Actividad agendada en el prototipo.',
                  status: 'Próximo',
                  primaryActionLabel: 'Editar evento',
                  secondaryActionLabel: 'Reprogramar',
                  extraActionLabel: 'Ver en calendario',
                  onAction: (action) =>
                      _handleEventAction(context, ref, event.id, action),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Recordatorios'),
            const SizedBox(height: AppSpacing.md),
            _RemindersList(
              reminders: data.reminders,
              onReminderTap: (reminder) => _openCalendarDetail(
                context,
                CalendarItemDetailSheet(
                  title: reminder.title,
                  type: 'Recordatorio',
                  icon: reminder.icon,
                  color: reminder.color,
                  date: 'Hoy',
                  time: 'Durante el día',
                  category: 'Recordatorios',
                  notes: 'Aviso rápido de prototipo.',
                  status: 'Pendiente',
                  primaryActionLabel: 'Marcar como completado',
                  secondaryActionLabel: 'Posponer',
                  extraActionLabel: 'Editar',
                  onAction: (action) =>
                      _handleReminderAction(context, ref, reminder.id, action),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Pagos programados'),
            const SizedBox(height: AppSpacing.md),
            _PaymentsList(
              payments: data.payments,
              onPaymentTap: (payment) => _openCalendarDetail(
                context,
                CalendarItemDetailSheet(
                  title: payment.title,
                  type: 'Tarea',
                  icon: payment.icon,
                  color: payment.color,
                  date: payment.dueLabel,
                  time: 'Pendiente',
                  category: 'Finanzas',
                  notes: 'Pago programado visible en calendario.',
                  status: 'Pendiente',
                  primaryActionLabel: 'Marcar como completada',
                  secondaryActionLabel: 'Cambiar prioridad',
                  extraActionLabel: 'Editar',
                  onAction: (action) =>
                      _handleTaskAction(context, ref, payment.id, action),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            Text('Acciones rápidas', style: textTheme.titleLarge),
            const SizedBox(height: AppSpacing.md),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: data.quickActions
                  .map(
                    (action) => QuickActionButton(
                      icon: action.icon,
                      label: action.label,
                      onTap: () {
                        if (action.label == '+ Evento') {
                          _openCreateEventSheet(context, ref);
                          return;
                        }

                        if (action.label == '+ Recordatorio') {
                          _openCreateReminderSheet(context, ref);
                          return;
                        }

                        if (action.label == '+ Tarea') {
                          _openCreateTaskSheet(context, ref);
                          return;
                        }

                        _showSimulatedAction(context, action.label);
                      },
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _WeekSelector extends StatelessWidget {
  const _WeekSelector({required this.days});

  final List<MockCalendarDay> days;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 78,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: days.length,
        separatorBuilder: (context, index) =>
            const SizedBox(width: AppSpacing.sm),
        itemBuilder: (context, index) {
          final day = days[index];
          return _WeekDayPill(day: day);
        },
      ),
    );
  }
}

class _WeekDayPill extends StatelessWidget {
  const _WeekDayPill({required this.day});

  final MockCalendarDay day;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final selected = day.isSelected;
    final backgroundColor = selected
        ? AppColors.primaryDark
        : AppColors.lightSurface;
    final foregroundColor = selected ? Colors.white : AppColors.textPrimary;
    final mutedColor = selected ? Colors.white70 : AppColors.textMuted;

    return Container(
      width: 58,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.md,
      ),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: selected ? AppColors.primaryDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            day.weekday,
            style: textTheme.labelMedium?.copyWith(color: mutedColor),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            day.day,
            style: textTheme.titleMedium?.copyWith(color: foregroundColor),
          ),
        ],
      ),
    );
  }
}

class _DaySummaryCard extends StatelessWidget {
  const _DaySummaryCard({required this.data});

  final MockCalendarData data;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AppCard(
      backgroundColor: AppColors.darkBackground,
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const ModuleBadge(
                icon: Icons.auto_awesome_rounded,
                color: AppColors.primaryDark,
                backgroundColor: AppColors.primary,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      data.summaryTitle,
                      style: textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      data.summarySubtitle,
                      style: textTheme.bodyMedium?.copyWith(
                        color: AppColors.textOnDarkSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: data.summaryChips
                .map(
                  (chip) => SummaryChip(
                    label: chip.label,
                    icon: chip.icon,
                    color: chip.color,
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _AgendaList extends StatelessWidget {
  const _AgendaList({required this.events, required this.onEventTap});

  final List<MockCalendarEvent> events;
  final ValueChanged<MockCalendarEvent> onEventTap;

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.calendar_today_rounded,
        title: 'Sin eventos',
        description: 'Crea un evento para organizar tu día.',
      );
    }

    return AppCard(
      child: Column(
        children: [
          for (final event in events) ...[
            _AgendaTile(event: event, onTap: () => onEventTap(event)),
            if (event != events.last) const SizedBox(height: AppSpacing.lg),
          ],
        ],
      ),
    );
  }
}

class _AgendaTile extends StatelessWidget {
  const _AgendaTile({required this.event, required this.onTap});

  final MockCalendarEvent event;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      child: Row(
        children: [
          SizedBox(
            width: 68,
            child: Text(event.time, style: textTheme.labelMedium),
          ),
          ModuleBadge(icon: event.icon, color: event.color, size: 38),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(event.title, style: textTheme.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(event.category, style: textTheme.bodySmall),
              ],
            ),
          ),
          const SummaryChip(
            label: 'Próximo',
            icon: Icons.schedule_rounded,
            color: AppColors.warning,
          ),
        ],
      ),
    );
  }
}

class _RemindersList extends StatelessWidget {
  const _RemindersList({required this.reminders, required this.onReminderTap});

  final List<MockCalendarReminder> reminders;
  final ValueChanged<MockCalendarReminder> onReminderTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        children: [
          for (final reminder in reminders) ...[
            _ReminderTile(
              reminder: reminder,
              onTap: () => onReminderTap(reminder),
            ),
            if (reminder != reminders.last)
              const SizedBox(height: AppSpacing.lg),
          ],
        ],
      ),
    );
  }
}

class _ReminderTile extends StatelessWidget {
  const _ReminderTile({required this.reminder, required this.onTap});

  final MockCalendarReminder reminder;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      child: Row(
        children: [
          ModuleBadge(icon: reminder.icon, color: reminder.color, size: 36),
          const SizedBox(width: AppSpacing.md),
          Expanded(child: Text(reminder.title, style: textTheme.titleMedium)),
          const SummaryChip(
            label: 'Pendiente',
            icon: Icons.pending_actions_rounded,
            color: AppColors.warning,
          ),
          const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
        ],
      ),
    );
  }
}

class _PaymentsList extends StatelessWidget {
  const _PaymentsList({required this.payments, required this.onPaymentTap});

  final List<MockCalendarPayment> payments;
  final ValueChanged<MockCalendarPayment> onPaymentTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        children: [
          for (final payment in payments) ...[
            _PaymentTile(payment: payment, onTap: () => onPaymentTap(payment)),
            if (payment != payments.last) const SizedBox(height: AppSpacing.lg),
          ],
        ],
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  const _PaymentTile({required this.payment, required this.onTap});

  final MockCalendarPayment payment;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      child: Row(
        children: [
          ModuleBadge(icon: payment.icon, color: payment.color, size: 38),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(payment.title, style: textTheme.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(payment.dueLabel, style: textTheme.bodySmall),
              ],
            ),
          ),
          const SummaryChip(
            label: 'Vence pronto',
            icon: Icons.schedule_rounded,
            color: AppColors.danger,
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            payment.amount,
            style: textTheme.titleMedium?.copyWith(color: AppColors.danger),
          ),
        ],
      ),
    );
  }
}
