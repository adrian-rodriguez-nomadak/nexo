import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../shared/mock/mock_dashboard.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/money_amount.dart';
import '../../../shared/presentation/widgets/quick_action_button.dart';
import '../../../shared/presentation/widgets/section_header.dart';
import '../../../shared/presentation/widgets/summary_chip.dart';
import '../../../shared/presentation/widgets/empty_state_card.dart';
import '../../auth/application/auth_providers.dart';
import '../../calendar/presentation/widgets/create_event_sheet.dart';
import '../../calendar/presentation/widgets/create_task_sheet.dart';
import '../../calendar/application/calendar_providers.dart';
import '../../finances/application/finances_providers.dart';
import '../../finances/presentation/widgets/create_expense_sheet.dart';
import '../../finances/presentation/widgets/create_payment_sheet.dart';
import '../../tasks/application/tasks_providers.dart';
import '../../finances/data/repositories/local_finances_repository.dart';
import '../../tasks/data/repositories/local_tasks_repository.dart';
import '../../calendar/data/repositories/local_calendar_repository.dart';
import '../../settings/data/categories_service.dart';
import '../../../core/database/database_provider.dart';
import 'dashboard_view_data.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _handleQuickAction(
    BuildContext context,
    WidgetRef ref,
    MockQuickAction action,
  ) async {
    if (action.label.contains('Gasto')) {
      final categories = await CategoriesService(
        ref.read(appDatabaseProvider),
      ).getAll();
      if (!context.mounted) return;
      CreateExpenseSheet.show(
        context: context,
        categories: categories.map((item) => item.name).toList(),
        onSave: (draft) async {
          final repository = ref.read(financesRepositoryProvider);
          if (repository is! LocalFinancesRepository) return;
          await repository.createMovement(
            type: 'expense',
            amount: draft.amount,
            description: draft.description,
            categoryName: draft.category,
          );
          ref
            ..invalidate(financeSummaryProvider)
            ..invalidate(financeMovementsProvider)
            ..invalidate(financeBudgetsProvider);
          if (context.mounted) _showSnackBar(context, 'Guardado localmente');
        },
      );
      return;
    }

    if (action.label.contains('Tarea')) {
      CreateTaskSheet.show(
        context: context,
        onSave: (draft) async {
          final repository = ref.read(tasksRepositoryProvider);
          if (repository is! LocalTasksRepository) return;
          await repository.createTask(
            title: draft.title,
            description: draft.description,
            priority: draft.priority,
          );
          ref.invalidate(tasksProvider);
          if (context.mounted) _showSnackBar(context, 'Guardado localmente');
        },
      );
      return;
    }

    if (action.label.contains('Evento')) {
      CreateEventSheet.show(
        context: context,
        onSave: (draft) async {
          final repository = ref.read(calendarRepositoryProvider);
          if (repository is! LocalCalendarRepository) return;
          await repository.createEvent(
            title: draft.title,
            description: draft.description,
            locationName: draft.location,
            startAt: draft.startAt,
            endAt: draft.endAt,
          );
          ref.invalidate(calendarEventsProvider);
          if (context.mounted) _showSnackBar(context, 'Guardado localmente');
        },
      );
      return;
    }

    if (action.label.contains('Pago')) {
      CreatePaymentSheet.show(
        context: context,
        onSave: (draft) async {
          final repository = ref.read(financesRepositoryProvider);
          if (repository is! LocalFinancesRepository) return;
          await repository.createUpcomingPayment(
            name: draft.name,
            amount: draft.amount,
            category: draft.category,
          );
          ref
            ..invalidate(financeSummaryProvider)
            ..invalidate(upcomingPaymentsProvider);
          if (context.mounted) _showSnackBar(context, 'Guardado localmente');
        },
      );
      return;
    }

    context.go('/inbox');
  }

  Future<void> _toggleTask(
    BuildContext context,
    WidgetRef ref,
    MockDashboardTask task,
  ) async {
    if (task.id == null) {
      context.go('/calendar');
      return;
    }
    final repository = ref.read(tasksRepositoryProvider);
    if (repository is! LocalTasksRepository) return;
    await repository.updateStatus(
      task.id!,
      task.done ? 'pending' : 'completed',
    );
    ref.invalidate(tasksProvider);
    if (context.mounted) {
      _showSnackBar(
        context,
        task.done ? 'Tarea reabierta' : 'Tarea completada',
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(financeSummaryProvider);
    final payments = ref.watch(upcomingPaymentsProvider);
    final events = ref.watch(calendarEventsProvider);
    final tasks = ref.watch(tasksProvider);
    final session = ref.watch(authSessionProvider).value;
    final sources = [summary, payments, events, tasks];
    if (sources.any((source) => source.isLoading)) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (sources.any((source) => source.hasError)) {
      return Scaffold(
        body: Center(
          child: EmptyStateCard(
            icon: Icons.cloud_off_rounded,
            title: 'No se pudo cargar Inicio',
            description: 'Tus datos siguen guardados. Intenta nuevamente.',
            actionLabel: 'Reintentar',
            onAction: () {
              ref
                ..invalidate(financeSummaryProvider)
                ..invalidate(upcomingPaymentsProvider)
                ..invalidate(calendarEventsProvider)
                ..invalidate(tasksProvider);
            },
          ),
        ),
      );
    }
    final data = buildDashboardViewData(
      userName: session?.name.isNotEmpty == true ? session!.name : 'tú',
      todayLabel: _todayLabel(DateTime.now()),
      summary: summary.value,
      payments: payments.value,
      events: events.value,
      tasks: tasks.value,
    );
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenPadding,
                AppSpacing.lg,
                AppSpacing.screenPadding,
                AppSpacing.lg,
              ),
              sliver: SliverList.list(
                children: [
                  _DashboardHeader(data: data),
                  const SizedBox(height: AppSpacing.xl),
                  _SummaryCard(data: data),
                  const SizedBox(height: AppSpacing.xxl),
                  const SectionHeader(title: 'Próximo evento'),
                  const SizedBox(height: AppSpacing.md),
                  _NextEventCard(
                    event: data.nextEvent,
                    onTap: () => context.go('/calendar'),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  SectionHeader(
                    title: 'Tareas de hoy',
                    actionLabel: 'Ver todo',
                    onActionTap: () => context.go('/calendar'),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _TasksCard(
                    tasks: data.tasks,
                    onTaskTap: (task) => _toggleTask(context, ref, task),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  const SectionHeader(title: 'Finanzas rápidas'),
                  const SizedBox(height: AppSpacing.md),
                  _FinanceGrid(
                    items: data.finances,
                    onItemTap: () => context.go('/finances'),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  SectionHeader(
                    title: 'Pagos próximos',
                    actionLabel: 'Finanzas',
                    onActionTap: () => context.go('/finances'),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _PaymentsCard(
                    payments: data.upcomingPayments,
                    onPaymentTap: (_) => context.go('/finances'),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  Text('Acciones rápidas', style: textTheme.titleLarge),
                  const SizedBox(height: AppSpacing.md),
                  _QuickActions(
                    actions: data.quickActions,
                    onActionTap: (action) =>
                        _handleQuickAction(context, ref, action),
                  ),
                  const SizedBox(height: 130),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/inbox'),
        tooltip: 'Inbox',
        child: const Icon(Icons.inbox_rounded),
      ),
    );
  }

  String _todayLabel(DateTime date) {
    const weekdays = [
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
      'domingo',
    ];
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return '${weekdays[date.weekday - 1]}, ${date.day} de ${months[date.month - 1]}';
  }
}

class _DashboardHeader extends StatelessWidget {
  const _DashboardHeader({required this.data});

  final MockDashboardData data;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Hola, ${data.user.name}', style: textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.xs),
              Text(data.user.todayLabel, style: textTheme.bodyMedium),
            ],
          ),
        ),
        const ModuleBadge(
          icon: Icons.auto_awesome_rounded,
          color: AppColors.primaryDark,
          backgroundColor: AppColors.primary,
          size: 48,
        ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.data});

  final MockDashboardData data;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AppCard(
      backgroundColor: AppColors.darkBackground,
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MoneyAmount(
            amount: data.summary.availableAmount,
            label: data.summary.availableLabel,
            color: Colors.white,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            data.summary.subtitle,
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textOnDarkSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: data.summary.chips
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

class _NextEventCard extends StatelessWidget {
  const _NextEventCard({required this.event, required this.onTap});

  final MockDashboardEvent event;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          const ModuleBadge(
            icon: Icons.calendar_today_rounded,
            color: AppColors.calendar,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(event.time, style: textTheme.labelMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(event.title, style: textTheme.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(event.location, style: textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TasksCard extends StatelessWidget {
  const _TasksCard({required this.tasks, required this.onTaskTap});

  final List<MockDashboardTask> tasks;
  final ValueChanged<MockDashboardTask> onTaskTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    if (tasks.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.task_alt_rounded,
        title: 'Sin tareas pendientes',
        description: 'Las tareas que agregues aparecerán aquí.',
      );
    }

    return AppCard(
      child: Column(
        children: [
          for (final task in tasks) ...[
            InkWell(
              onTap: () => onTaskTap(task),
              borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
              child: Row(
                children: [
                  ModuleBadge(
                    icon: task.done
                        ? Icons.check_rounded
                        : Icons.radio_button_unchecked_rounded,
                    color: task.done ? AppColors.success : AppColors.task,
                    size: 36,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.title,
                          style: textTheme.titleMedium?.copyWith(
                            decoration: task.done
                                ? TextDecoration.lineThrough
                                : TextDecoration.none,
                            color: task.done ? AppColors.textMuted : null,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(task.detail, style: textTheme.bodySmall),
                      ],
                    ),
                  ),
                  SummaryChip(
                    label: task.done ? 'Completado' : 'Pendiente',
                    color: task.done ? AppColors.success : AppColors.warning,
                  ),
                ],
              ),
            ),
            if (task != tasks.last) const SizedBox(height: AppSpacing.lg),
          ],
        ],
      ),
    );
  }
}

class _FinanceGrid extends StatelessWidget {
  const _FinanceGrid({required this.items, required this.onItemTap});

  final List<MockFinanceQuickItem> items;
  final VoidCallback onItemTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final item in items) ...[
          Expanded(
            child: AppCard(
              onTap: onItemTap,
              child: MoneyAmount(
                amount: item.amount,
                label: item.label,
                variant: MoneyAmountVariant.compact,
                color: item.color,
              ),
            ),
          ),
          if (item != items.last) const SizedBox(width: AppSpacing.md),
        ],
      ],
    );
  }
}

class _PaymentsCard extends StatelessWidget {
  const _PaymentsCard({required this.payments, required this.onPaymentTap});

  final List<MockUpcomingPayment> payments;
  final ValueChanged<MockUpcomingPayment> onPaymentTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    if (payments.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.payments_outlined,
        title: 'Sin pagos próximos',
        description: 'No tienes pagos programados por ahora.',
      );
    }

    return AppCard(
      child: Column(
        children: [
          for (final payment in payments) ...[
            InkWell(
              onTap: () => onPaymentTap(payment),
              borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
              child: Row(
                children: [
                  ModuleBadge(
                    icon: Icons.payments_rounded,
                    color: payment.color,
                    size: 38,
                  ),
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
                    label: 'Próximo',
                    icon: Icons.schedule_rounded,
                    color: AppColors.warning,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(payment.amount, style: textTheme.titleMedium),
                ],
              ),
            ),
            if (payment != payments.last) const SizedBox(height: AppSpacing.lg),
          ],
        ],
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.actions, required this.onActionTap});

  final List<MockQuickAction> actions;
  final ValueChanged<MockQuickAction> onActionTap;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: actions
          .map(
            (action) => QuickActionButton(
              icon: action.icon,
              label: action.label,
              onTap: () => onActionTap(action),
            ),
          )
          .toList(),
    );
  }
}
