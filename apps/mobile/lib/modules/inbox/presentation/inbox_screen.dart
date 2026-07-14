import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/formatters.dart';
import '../application/inbox_providers.dart';
import '../domain/models/interpreted_action.dart';
import '../../../shared/presentation/widgets/app_back_button.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/quick_action_button.dart';
import '../../../shared/presentation/widgets/section_header.dart';
import '../../calendar/presentation/widgets/create_event_sheet.dart';
import '../../calendar/presentation/widgets/create_reminder_sheet.dart';
import '../../debts/presentation/widgets/create_debt_from_debts_sheet.dart';
import '../../finances/presentation/widgets/create_expense_sheet.dart';
import '../../finances/presentation/widgets/create_income_sheet.dart';
import '../../calendar/presentation/widgets/create_task_sheet.dart';
import '../../subscriptions/presentation/widgets/create_subscription_sheet.dart';
import '../../finances/application/finances_providers.dart';
import '../../finances/data/repositories/local_finances_repository.dart';
import '../../tasks/application/tasks_providers.dart';
import '../../tasks/data/repositories/local_tasks_repository.dart';
import '../../calendar/application/calendar_providers.dart';
import '../../calendar/data/repositories/local_calendar_repository.dart';
import '../../reminders/application/reminders_providers.dart';
import '../../reminders/data/repositories/local_reminders_repository.dart';
import '../../debts/application/debts_providers.dart';
import '../../debts/data/repositories/local_debts_repository.dart';
import '../../subscriptions/application/subscriptions_providers.dart';
import '../../subscriptions/data/repositories/local_subscriptions_repository.dart';
import '../../settings/application/settings_providers.dart';
import 'models/inbox_interpretation.dart';
import 'widgets/interpreted_result_card.dart';

class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key});

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  final _controller = TextEditingController();
  final List<InterpretedAction> _actions = [];
  final List<InboxInterpretation> _results = [];
  InterpretedAction? _selectedAction;
  bool _isInterpreting = false;

  static const _suggestions = [
    'Gasté 180 en comida',
    'Recuérdame pagar el gym',
    'Me deben 500',
    'Cita dental viernes 11 AM',
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _interpret([String? text]) async {
    final settings = ref.read(appSettingsProvider).value;
    if (settings?.smartInbox == false) {
      _showSnackBar(
        'El Inbox inteligente está desactivado. Puedes activarlo en Ajustes.',
      );
      return;
    }
    final value = (text ?? _controller.text).trim();
    if (value.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Escribe algo para interpretar')),
      );
      return;
    }

    if (text != null) {
      _controller.text = text;
      _controller.selection = TextSelection.collapsed(offset: text.length);
    }

    setState(() => _isInterpreting = true);

    try {
      final interpreted = await ref.read(
        interpretInboxTextProvider(value).future,
      );
      if (!mounted) return;
      setState(() {
        final actions = [interpreted, ...interpreted.additionalActions];
        _actions
          ..clear()
          ..addAll(actions);
        _results
          ..clear()
          ..addAll(
            actions.map((action) => _fromInterpretedAction(action, value)),
          );
      });
      if (settings?.confirmBeforeSave == false) {
        await _saveWithoutConfirmation();
      }
    } catch (_) {
      if (!mounted) return;
      _showSnackBar('No se pudo interpretar. Intenta nuevamente.');
    } finally {
      if (mounted) setState(() => _isInterpreting = false);
    }
  }

  Future<void> _saveWithoutConfirmation() async {
    final saved = <InterpretedAction>[];
    final pairs = List.generate(
      _actions.length,
      (index) => (_actions[index], _results[index]),
    );
    for (final pair in pairs) {
      if (await _persistDetected(pair.$1, pair.$2)) saved.add(pair.$1);
    }
    if (!mounted || saved.isEmpty) return;
    setState(() {
      for (final action in saved) {
        final index = _actions.indexOf(action);
        if (index >= 0) {
          _actions.removeAt(index);
          _results.removeAt(index);
        }
      }
      if (_actions.isEmpty) _controller.clear();
    });
    _showSnackBar(
      saved.length == 1
          ? 'Guardado automáticamente'
          : '${saved.length} elementos guardados automáticamente',
    );
  }

  Future<bool> _persistDetected(
    InterpretedAction action,
    InboxInterpretation result,
  ) async {
    final payload = action.payload;
    final amount =
        (payload['amount'] as num?)?.toDouble() ??
        (payload['total_amount'] as num?)?.toDouble() ??
        0;
    switch (result.type) {
      case 'expense' || 'income':
        if (amount <= 0) return false;
        final repository = ref.read(financesRepositoryProvider);
        if (repository is! LocalFinancesRepository) return false;
        await repository.createMovement(
          type: result.type,
          amount: amount,
          description: payload['description']?.toString() ?? action.title,
          categoryName: payload['category']?.toString() ?? 'General',
        );
        ref
          ..invalidate(financeSummaryProvider)
          ..invalidate(financeMovementsProvider)
          ..invalidate(financeBudgetsProvider);
        return true;
      case 'task':
        final repository = ref.read(tasksRepositoryProvider);
        if (repository is! LocalTasksRepository) return false;
        await repository.createTask(
          title: action.title,
          description: payload['description']?.toString() ?? '',
          priority: payload['priority']?.toString() ?? 'medium',
        );
        ref.invalidate(tasksProvider);
        return true;
      case 'reminder':
        final date = _date(payload['remind_at']);
        if (date == null) return false;
        final repository = ref.read(remindersRepositoryProvider);
        if (repository is! LocalRemindersRepository) return false;
        await repository.createReminder(
          title: action.title,
          description: payload['description']?.toString() ?? '',
          remindAt: date,
        );
        ref.invalidate(remindersProvider);
        return true;
      case 'debtInFavor':
        if (amount <= 0) return false;
        final repository = ref.read(debtsRepositoryProvider);
        if (repository is! LocalDebtsRepository) return false;
        await repository.createDebt(
          name: payload['name']?.toString() ?? action.title,
          type: payload['debt_type'] == 'i_owe' ? 'i_owe' : 'they_owe_me',
          amount: amount,
          notes: payload['notes']?.toString() ?? '',
        );
        ref.invalidate(debtsProvider);
        return true;
      case 'event':
        final start = _date(payload['start_at']);
        if (start == null) return false;
        final repository = ref.read(calendarRepositoryProvider);
        if (repository is! LocalCalendarRepository) return false;
        await repository.createEvent(
          title: action.title,
          description: payload['description']?.toString() ?? '',
          locationName: payload['location_name']?.toString() ?? '',
          startAt: start,
          endAt: _date(payload['end_at']),
        );
        ref.invalidate(calendarEventsProvider);
        return true;
      case 'subscription':
        if (amount <= 0) return false;
        final repository = ref.read(subscriptionsRepositoryProvider);
        if (repository is! LocalSubscriptionsRepository) return false;
        await repository.createSubscription(
          name: payload['name']?.toString() ?? action.title,
          amount: amount,
          billingDay: (payload['billing_day'] as num?)?.toInt() ?? 1,
          category: payload['category']?.toString() ?? '',
        );
        ref.invalidate(subscriptionsProvider);
        return true;
      default:
        return false;
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  void _continueWithResult(
    InterpretedAction action,
    InboxInterpretation result,
  ) {
    _selectedAction = action;
    final payload = action.payload;
    final amount =
        (payload['amount'] as num?)?.toDouble() ??
        (payload['total_amount'] as num?)?.toDouble() ??
        0;
    final title = action.title;

    switch (result.type) {
      case 'expense':
        CreateExpenseSheet.show(
          context: context,
          initialValue: ExpenseDraft(
            amount: amount,
            category: payload['category']?.toString() ?? '',
            description: payload['description']?.toString() ?? title,
          ),
          onSave: _saveExpense,
        );
        return;
      case 'income':
        CreateIncomeSheet.show(
          context: context,
          initialValue: IncomeDraft(
            amount: amount,
            source: payload['category']?.toString() ?? '',
            description: payload['description']?.toString() ?? title,
          ),
          onSave: _saveIncome,
        );
        return;
      case 'task':
        CreateTaskSheet.show(
          context: context,
          initialDraft: TaskDraft(
            title: title,
            description: payload['description']?.toString() ?? '',
            priority: payload['priority']?.toString() ?? 'medium',
          ),
          onSave: _saveTask,
        );
        return;
      case 'reminder':
        CreateReminderSheet.show(
          context: context,
          initialDraft: ReminderDraft(
            title: title,
            description: payload['description']?.toString() ?? '',
            remindAt: _date(payload['remind_at']) ?? DateTime.now(),
          ),
          onSave: _saveReminder,
        );
        return;
      case 'debtInFavor':
        CreateDebtFromDebtsSheet.show(
          context: context,
          initialType: payload['debt_type'] == 'i_owe' ? 'Debo' : 'Me deben',
          initialDraft: DebtDraft(
            name: payload['name']?.toString() ?? title,
            amount: amount,
            type: payload['debt_type'] == 'i_owe' ? 'Debo' : 'Me deben',
            notes: payload['notes']?.toString() ?? '',
          ),
          onSave: _saveDebt,
        );
        return;
      case 'event':
        CreateEventSheet.show(
          context: context,
          initialDraft: EventDraft(
            title: title,
            location: payload['location_name']?.toString() ?? '',
            description: payload['description']?.toString() ?? '',
            startAt: _date(payload['start_at']) ?? DateTime.now(),
            endAt: _date(payload['end_at']),
          ),
          onSave: _saveEvent,
        );
        return;
      case 'subscription':
        CreateSubscriptionSheet.show(
          context: context,
          initialDraft: SubscriptionDraft(
            name: payload['name']?.toString() ?? title,
            amount: amount,
            billingDay: (payload['billing_day'] as num?)?.toInt() ?? 1,
            category: payload['category']?.toString() ?? '',
          ),
          onSave: _saveSubscription,
        );
        return;
      default:
        _showSnackBar('La nota quedó en Inbox para revisión');
    }
  }

  DateTime? _date(Object? value) =>
      value == null ? null : DateTime.tryParse(value.toString())?.toLocal();

  Future<void> _saveExpense(ExpenseDraft draft) => _saveMovement(
    type: 'expense',
    amount: draft.amount,
    description: draft.description,
    category: draft.category,
  );

  Future<void> _saveIncome(IncomeDraft draft) => _saveMovement(
    type: 'income',
    amount: draft.amount,
    description: draft.description,
    category: draft.source,
  );

  Future<void> _saveMovement({
    required String type,
    required double amount,
    required String description,
    required String category,
  }) async {
    final repository = ref.read(financesRepositoryProvider);
    if (repository is! LocalFinancesRepository) return;
    await repository.createMovement(
      type: type,
      amount: amount,
      description: description,
      categoryName: category,
    );
    ref
      ..invalidate(financeSummaryProvider)
      ..invalidate(financeMovementsProvider)
      ..invalidate(financeBudgetsProvider);
    _saved();
  }

  Future<void> _saveTask(TaskDraft draft) async {
    final repository = ref.read(tasksRepositoryProvider);
    if (repository is! LocalTasksRepository) return;
    await repository.createTask(
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
    );
    ref.invalidate(tasksProvider);
    _saved();
  }

  Future<void> _saveReminder(ReminderDraft draft) async {
    final repository = ref.read(remindersRepositoryProvider);
    if (repository is! LocalRemindersRepository) return;
    await repository.createReminder(
      title: draft.title,
      description: draft.description,
      remindAt: draft.remindAt,
    );
    ref.invalidate(remindersProvider);
    _saved();
  }

  Future<void> _saveDebt(DebtDraft draft) async {
    final repository = ref.read(debtsRepositoryProvider);
    if (repository is! LocalDebtsRepository) return;
    await repository.createDebt(
      name: draft.name,
      type: draft.type == 'Me deben' ? 'they_owe_me' : 'i_owe',
      amount: draft.amount,
      notes: draft.notes,
    );
    ref.invalidate(debtsProvider);
    _saved();
  }

  Future<void> _saveEvent(EventDraft draft) async {
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
    _saved();
  }

  Future<void> _saveSubscription(SubscriptionDraft draft) async {
    final repository = ref.read(subscriptionsRepositoryProvider);
    if (repository is! LocalSubscriptionsRepository) return;
    await repository.createSubscription(
      name: draft.name,
      amount: draft.amount,
      billingDay: draft.billingDay,
      category: draft.category,
    );
    ref.invalidate(subscriptionsProvider);
    _saved();
  }

  void _saved() {
    if (!mounted) return;
    setState(() {
      final selected = _selectedAction;
      final index = selected == null ? -1 : _actions.indexOf(selected);
      if (index >= 0) {
        _actions.removeAt(index);
        _results.removeAt(index);
      }
      _selectedAction = null;
      if (_actions.isEmpty) _controller.clear();
    });
    _showSnackBar('Guardado localmente y listo para sincronizar');
  }

  void _cancelResult(InterpretedAction action) {
    setState(() {
      final index = _actions.indexOf(action);
      if (index >= 0) {
        _actions.removeAt(index);
        _results.removeAt(index);
      }
      if (_actions.isEmpty) _controller.clear();
    });
  }

  InboxInterpretation _fromInterpretedAction(
    InterpretedAction action,
    String rawText,
  ) {
    final amount = action.payload['amount'];
    final secondaryAmount = amount is num ? money(amount) : 'Pendiente';

    final base = switch (action.intent) {
      'create_expense' || 'expense' => InboxInterpretation(
        type: 'expense',
        detectedLabel: 'un gasto',
        title: action.payload['description']?.toString() ?? 'Gasto',
        secondaryLabel: 'Monto',
        secondary: secondaryAmount,
        category: 'Finanzas',
        preview: action.preview,
        icon: Icons.receipt_long_rounded,
        color: AppColors.finance,
      ),
      'create_income' || 'income' => InboxInterpretation(
        type: 'income',
        detectedLabel: 'un ingreso',
        title: action.title,
        secondaryLabel: 'Monto',
        secondary: secondaryAmount,
        category: 'Finanzas',
        preview: action.preview,
        icon: Icons.trending_up_rounded,
        color: AppColors.finance,
      ),
      'create_task' || 'task' => InboxInterpretation(
        type: 'task',
        detectedLabel: 'una tarea',
        title: action.title,
        secondaryLabel: 'Prioridad',
        secondary: action.payload['priority']?.toString() ?? 'Media',
        category: 'Tareas',
        preview: action.preview,
        icon: Icons.add_task_rounded,
        color: AppColors.task,
      ),
      'create_reminder' || 'reminder' => InboxInterpretation(
        type: 'reminder',
        detectedLabel: 'un recordatorio',
        title: action.payload['title']?.toString() ?? rawText,
        secondaryLabel: 'Fecha',
        secondary: 'Pendiente',
        category: 'Recordatorios',
        preview: action.preview,
        icon: Icons.notifications_active_rounded,
        color: AppColors.task,
      ),
      'create_debt' || 'debtInFavor' => InboxInterpretation(
        type: 'debtInFavor',
        detectedLabel: 'una deuda a favor',
        title: 'Cobro pendiente',
        secondaryLabel: 'Monto',
        secondary: secondaryAmount,
        category: 'Deudas por cobrar',
        preview: action.preview,
        icon: Icons.savings_rounded,
        color: AppColors.debt,
      ),
      'create_event' || 'event' => InboxInterpretation(
        type: 'event',
        detectedLabel: 'un evento',
        title: action.payload['title']?.toString() ?? rawText,
        secondaryLabel: 'Fecha',
        secondary: 'Pendiente',
        category: 'Calendario',
        preview: action.preview,
        icon: Icons.calendar_today_rounded,
        color: AppColors.calendar,
      ),
      'create_subscription' || 'subscription' => InboxInterpretation(
        type: 'subscription',
        detectedLabel: 'una suscripción',
        title: action.title,
        secondaryLabel: 'Monto',
        secondary: secondaryAmount,
        category: 'Suscripciones',
        preview: action.preview,
        icon: Icons.subscriptions_rounded,
        color: AppColors.subscription,
      ),
      _ => InboxInterpretation(
        type: 'note',
        detectedLabel: 'una nota rápida',
        title: 'Captura sin clasificar',
        secondaryLabel: 'Estado',
        secondary: 'Pendiente de revisar',
        category: 'Inbox',
        preview: action.preview,
        icon: Icons.inbox_rounded,
        color: AppColors.accent,
      ),
    };
    return InboxInterpretation(
      type: base.type,
      detectedLabel: base.detectedLabel,
      title: action.title.isEmpty ? base.title : action.title,
      secondaryLabel: base.secondaryLabel,
      secondary: base.secondary,
      category: action.payload['category']?.toString() ?? base.category,
      preview: base.preview,
      icon: base.icon,
      color: base.color,
      confidence: action.confidence,
      source: action.source,
    );
  }

  @override
  Widget build(BuildContext context) {
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
                      Text('Inbox inteligente', style: textTheme.headlineLarge),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Registra cualquier cosa sin pensar dónde va.',
                        style: textTheme.bodyMedium,
                      ),
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
            ),
            const SizedBox(height: AppSpacing.xl),
            AppCard(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('¿Qué quieres registrar?', style: textTheme.titleLarge),
                  const SizedBox(height: AppSpacing.md),
                  TextField(
                    controller: _controller,
                    minLines: 4,
                    maxLines: 6,
                    textInputAction: TextInputAction.newline,
                    decoration: const InputDecoration(
                      hintText: 'Ej. gasté 180 en comida hoy',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  ElevatedButton.icon(
                    onPressed: _isInterpreting ? null : () => _interpret(),
                    icon: _isInterpreting
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.auto_awesome_rounded),
                    label: Text(
                      _isInterpreting ? 'Interpretando' : 'Interpretar',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Sugerencias rápidas'),
            const SizedBox(height: AppSpacing.md),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: _suggestions
                  .map(
                    (suggestion) => QuickActionButton(
                      icon: Icons.add_rounded,
                      label: suggestion,
                      onTap: () => _interpret(suggestion),
                    ),
                  )
                  .toList(),
            ),
            if (_results.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.xxl),
              for (var index = 0; index < _results.length; index++) ...[
                InterpretedResultCard(
                  result: _results[index],
                  onSave: () =>
                      _continueWithResult(_actions[index], _results[index]),
                  onEdit: () =>
                      _continueWithResult(_actions[index], _results[index]),
                  onCancel: () => _cancelResult(_actions[index]),
                ),
                if (index < _results.length - 1)
                  const SizedBox(height: AppSpacing.md),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
