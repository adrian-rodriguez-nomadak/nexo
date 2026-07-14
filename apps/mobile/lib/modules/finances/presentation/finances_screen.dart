import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/notifications/notification_providers.dart';
import '../application/finances_providers.dart';
import '../data/repositories/local_finances_repository.dart';
import '../domain/models/finance_account.dart';
import '../domain/models/finance_budget.dart';
import '../domain/models/finance_summary.dart';
import '../../settings/application/settings_providers.dart';
import '../../settings/data/categories_service.dart';
import '../../../core/database/database_provider.dart';
import '../../../shared/mock/mock_finances.dart';
import '../../../shared/presentation/widgets/app_back_button.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/money_amount.dart';
import '../../../shared/presentation/widgets/quick_action_button.dart';
import '../../../shared/presentation/widgets/section_header.dart';
import '../../../shared/presentation/widgets/summary_chip.dart';
import '../../../shared/presentation/widgets/empty_state_card.dart';
import 'widgets/create_expense_sheet.dart';
import 'widgets/create_income_sheet.dart';
import 'widgets/create_payment_sheet.dart';
import 'widgets/create_account_sheet.dart';
import 'widgets/create_budget_sheet.dart';
import 'widgets/create_transfer_sheet.dart';
import 'finance_view_data.dart';
import 'widgets/finance_movement_detail_sheet.dart';
import 'widgets/upcoming_payment_detail_sheet.dart';

class FinancesScreen extends ConsumerWidget {
  const FinancesScreen({super.key});

  Future<void> _openCreateExpenseSheet(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final categories = await CategoriesService(
      ref.read(appDatabaseProvider),
    ).getAll();
    final accounts = await ref.read(financeAccountsProvider.future);
    if (!context.mounted) return;
    CreateExpenseSheet.show(
      context: context,
      categories: categories.map((item) => item.name).toList(),
      accounts: accounts,
      onSave: (draft) => _saveMovement(
        context,
        ref,
        type: 'expense',
        amount: draft.amount,
        description: draft.description,
        categoryName: draft.category,
        accountId: draft.accountId,
      ),
    );
  }

  Future<void> _openCreateIncomeSheet(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final accounts = await ref.read(financeAccountsProvider.future);
    if (!context.mounted) return;
    CreateIncomeSheet.show(
      context: context,
      accounts: accounts,
      onSave: (draft) => _saveMovement(
        context,
        ref,
        type: 'income',
        amount: draft.amount,
        description: draft.description,
        categoryName: draft.source,
        accountId: draft.accountId,
      ),
    );
  }

  void _openCreateAccountSheet(BuildContext context, WidgetRef ref) {
    CreateAccountSheet.show(
      context: context,
      onSave: (draft) async {
        final repository = ref.read(financesRepositoryProvider);
        if (repository is! LocalFinancesRepository) return;
        await repository.createAccount(
          name: draft.name,
          type: draft.type,
          initialBalance: draft.initialBalance,
        );
        ref
          ..invalidate(financeAccountsProvider)
          ..invalidate(financeSummaryProvider);
        if (context.mounted) _showSnackBar(context, 'Cuenta guardada');
      },
    );
  }

  Future<void> _openCreateBudgetSheet(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final categories = await CategoriesService(
      ref.read(appDatabaseProvider),
    ).getAll();
    if (!context.mounted) return;
    CreateBudgetSheet.show(
      context: context,
      categories: categories.map((item) => item.name).toList(),
      onSave: (draft) async {
        final repository = ref.read(financesRepositoryProvider);
        if (repository is! LocalFinancesRepository) return;
        await repository.saveBudget(
          category: draft.category,
          amount: draft.amount,
        );
        ref.invalidate(financeBudgetsProvider);
        if (context.mounted) _showSnackBar(context, 'Presupuesto guardado');
      },
    );
  }

  Future<void> _deleteBudget(WidgetRef ref, FinanceBudget budget) async {
    final repository = ref.read(financesRepositoryProvider);
    if (repository is! LocalFinancesRepository) return;
    await repository.deleteBudget(budget.id);
    ref.invalidate(financeBudgetsProvider);
  }

  Future<void> _deleteAccount(
    BuildContext context,
    WidgetRef ref,
    FinanceAccount account,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('¿Eliminar ${account.name}?'),
        content: const Text(
          'Su saldo inicial dejará de formar parte del dinero disponible.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final repository = ref.read(financesRepositoryProvider);
    if (repository is! LocalFinancesRepository) return;
    await repository.deleteAccount(account.id);
    ref
      ..invalidate(financeAccountsProvider)
      ..invalidate(financeSummaryProvider);
  }

  Future<void> _openTransfer(
    BuildContext context,
    WidgetRef ref,
    List<FinanceAccount> accounts,
  ) async {
    if (accounts.length < 2) {
      _showSnackBar(context, 'Agrega al menos dos cuentas');
      return;
    }
    await CreateTransferSheet.show(
      context: context,
      accounts: accounts,
      onSave: (draft) async {
        final repository = ref.read(financesRepositoryProvider);
        if (repository is! LocalFinancesRepository) return;
        await repository.createTransfer(
          fromAccountId: draft.fromAccountId,
          toAccountId: draft.toAccountId,
          amount: draft.amount,
          notes: draft.notes,
        );
        ref.invalidate(financeAccountsProvider);
      },
    );
  }

  void _openCreatePaymentSheet(BuildContext context, WidgetRef ref) {
    CreatePaymentSheet.show(
      context: context,
      onSave: (draft) => _savePayment(context, ref, draft),
    );
  }

  void _openCreateDebtSheet(BuildContext context) {
    context.go('/debts');
  }

  void _openMovementDetail(
    BuildContext context,
    WidgetRef ref,
    MockFinanceMovement movement,
  ) {
    FinanceMovementDetailSheet.show(
      context: context,
      movement: movement,
      onAction: (action) =>
          _handleMovementAction(context, ref, movement, action),
    );
  }

  void _openPaymentDetail(
    BuildContext context,
    WidgetRef ref,
    MockFinancePayment payment,
  ) {
    UpcomingPaymentDetailSheet.show(
      context: context,
      payment: payment,
      onAction: (action) => _handlePaymentAction(context, ref, payment, action),
    );
  }

  Future<void> _handleMovementAction(
    BuildContext context,
    WidgetRef ref,
    MockFinanceMovement movement,
    String action,
  ) async {
    if (movement.id == null) {
      _showSnackBar(context, 'Acción disponible para datos locales');
      return;
    }
    if (action == 'edit') {
      _openMovementEditor(context, ref, movement);
      return;
    }
    if (action != 'delete') return;
    final repository = ref.read(financesRepositoryProvider);
    if (repository is! LocalFinancesRepository) return;
    await repository.deleteMovement(movement.id!);
    ref
      ..invalidate(financeSummaryProvider)
      ..invalidate(financeMovementsProvider)
      ..invalidate(financeBudgetsProvider);
    if (context.mounted) _showSnackBar(context, 'Movimiento eliminado');
  }

  Future<void> _handlePaymentAction(
    BuildContext context,
    WidgetRef ref,
    MockFinancePayment payment,
    String action,
  ) async {
    if (payment.id == null) {
      _showSnackBar(context, 'Acción disponible para datos locales');
      return;
    }
    final repository = ref.read(financesRepositoryProvider);
    if (repository is! LocalFinancesRepository) return;
    if (action == 'edit') {
      _openPaymentEditor(context, ref, payment);
      return;
    }
    if (action == 'delete') {
      await repository.deleteUpcomingPayment(payment.id!);
    } else if (action == 'paid') {
      await repository.updateUpcomingPaymentStatus(payment.id!, 'paid');
    } else {
      return;
    }
    ref
      ..invalidate(financeSummaryProvider)
      ..invalidate(upcomingPaymentsProvider);
    if (context.mounted) {
      _showSnackBar(
        context,
        action == 'paid' ? 'Pago marcado como pagado' : 'Pago eliminado',
      );
    }
  }

  void _openMovementEditor(
    BuildContext context,
    WidgetRef ref,
    MockFinanceMovement movement,
  ) {
    final amount = _amountFromLabel(movement.amount);
    if (movement.isIncome) {
      CreateIncomeSheet.show(
        context: context,
        initialValue: IncomeDraft(
          amount: amount,
          source: movement.category,
          description: movement.title,
        ),
        onSave: (draft) => _updateMovement(
          context,
          ref,
          movement.id!,
          'income',
          draft.amount,
          draft.source,
          draft.description,
        ),
      );
    } else {
      CreateExpenseSheet.show(
        context: context,
        initialValue: ExpenseDraft(
          amount: amount,
          category: movement.category,
          description: movement.title,
        ),
        onSave: (draft) => _updateMovement(
          context,
          ref,
          movement.id!,
          'expense',
          draft.amount,
          draft.category,
          draft.description,
        ),
      );
    }
  }

  void _openPaymentEditor(
    BuildContext context,
    WidgetRef ref,
    MockFinancePayment payment,
  ) {
    CreatePaymentSheet.show(
      context: context,
      initialValue: PaymentDraft(
        name: payment.title,
        amount: _amountFromLabel(payment.amount),
        category: 'Pagos próximos',
        dueDate: DateTime.now().add(const Duration(days: 3)),
      ),
      onSave: (draft) async {
        final repository = ref.read(financesRepositoryProvider);
        if (repository is! LocalFinancesRepository) return;
        await repository.updateUpcomingPayment(
          id: payment.id!,
          name: draft.name,
          amount: draft.amount,
          category: draft.category,
        );
        ref
          ..invalidate(financeSummaryProvider)
          ..invalidate(upcomingPaymentsProvider);
      },
    );
  }

  Future<void> _updateMovement(
    BuildContext context,
    WidgetRef ref,
    String id,
    String type,
    double amount,
    String category,
    String description,
  ) async {
    final repository = ref.read(financesRepositoryProvider);
    if (repository is! LocalFinancesRepository) return;
    await repository.updateMovement(
      id: id,
      type: type,
      amount: amount,
      categoryName: category,
      description: description,
      paymentMethod: 'local',
    );
    ref
      ..invalidate(financeSummaryProvider)
      ..invalidate(financeMovementsProvider)
      ..invalidate(financeBudgetsProvider);
    if (context.mounted) _showSnackBar(context, 'Movimiento actualizado');
  }

  double _amountFromLabel(String value) =>
      double.tryParse(value.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _saveMovement(
    BuildContext context,
    WidgetRef ref, {
    required String type,
    required double amount,
    required String description,
    required String categoryName,
    String? accountId,
  }) async {
    final repository = ref.read(financesRepositoryProvider);
    if (repository is! LocalFinancesRepository) {
      _showSnackBar(context, 'Guardado en modo de demostración');
      return;
    }

    try {
      await repository.createMovement(
        type: type,
        amount: amount,
        description: description,
        categoryName: categoryName,
        paymentMethod: 'local',
        accountId: accountId,
      );
      if (!context.mounted) return;
      ref.invalidate(financeSummaryProvider);
      ref.invalidate(financeMovementsProvider);
      ref.invalidate(financeBudgetsProvider);
      ref.invalidate(financeAccountsProvider);
      _showSnackBar(context, 'Guardado localmente');
    } catch (_) {
      _showSnackBar(context, 'No se pudo guardar localmente');
    }
  }

  Future<void> _savePayment(
    BuildContext context,
    WidgetRef ref,
    PaymentDraft draft,
  ) async {
    final repository = ref.read(financesRepositoryProvider);
    if (repository is! LocalFinancesRepository) {
      _showSnackBar(
        context,
        'No se puede guardar con la fuente de datos actual',
      );
      return;
    }

    try {
      final payment = await repository.createUpcomingPayment(
        name: draft.name,
        amount: draft.amount,
        category: draft.category,
        dueDate: draft.dueDate,
      );
      if (ref.read(appSettingsProvider).value?.upcomingPayments == true) {
        await ref
            .read(notificationServiceProvider)
            .schedule(
              id: payment.$1.hashCode & 0x7fffffff,
              title: 'Pago próximo: ${draft.name}',
              body: 'Tienes un pago programado por ${money(draft.amount)}.',
              date: payment.$2.subtract(const Duration(hours: 9)),
            );
      }
      if (!context.mounted) return;
      ref.invalidate(financeSummaryProvider);
      ref.invalidate(upcomingPaymentsProvider);
      _showSnackBar(context, 'Guardado localmente');
    } catch (_) {
      _showSnackBar(context, 'No se pudo guardar localmente');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(financeSummaryProvider);
    final movements = ref.watch(financeMovementsProvider);
    final payments = ref.watch(upcomingPaymentsProvider);
    final accounts = ref.watch(financeAccountsProvider);
    final budgets = ref.watch(financeBudgetsProvider);
    final budgetPeriod =
        ref.watch(appSettingsProvider).value?.budgetPeriod ?? 'Quincenal';
    final hasError =
        summary.hasError || movements.hasError || payments.hasError;
    final isLoading =
        summary.isLoading || movements.isLoading || payments.isLoading;
    final data =
        summary.value != null &&
            movements.value != null &&
            payments.value != null
        ? buildFinancesViewData(
            summary: summary.value!,
            movements: movements.value!,
            upcomingPayments: payments.value!,
          )
        : buildFinancesViewData(
            summary: const FinanceSummary(
              availableAmount: 0,
              incomeTotal: 0,
              expenseTotal: 0,
              upcomingPaymentsTotal: 0,
            ),
            movements: const [],
            upcomingPayments: const [],
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
                      Text('Finanzas', style: textTheme.headlineLarge),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Controla tu dinero disponible, pagos y movimientos.',
                        style: textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const ModuleBadge(
                  icon: Icons.account_balance_wallet_rounded,
                  color: AppColors.primaryDark,
                  backgroundColor: AppColors.primary,
                  size: 48,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            if (isLoading) ...[
              const Center(child: CircularProgressIndicator()),
              const SizedBox(height: AppSpacing.xl),
            ],
            if (hasError) ...[
              const _FallbackNotice(),
              const SizedBox(height: AppSpacing.xl),
            ],
            _AvailableCard(data: data),
            const SizedBox(height: AppSpacing.xxl),
            SectionHeader(
              title: 'Mis cuentas',
              actionLabel: 'Agregar',
              onActionTap: () => _openCreateAccountSheet(context, ref),
            ),
            const SizedBox(height: AppSpacing.md),
            _AccountsCard(
              accounts: accounts.value ?? const [],
              onAdd: () => _openCreateAccountSheet(context, ref),
              onDelete: (account) => _deleteAccount(context, ref, account),
              onTransfer: () =>
                  _openTransfer(context, ref, accounts.value ?? const []),
            ),
            const SizedBox(height: AppSpacing.xxl),
            _SummaryGrid(items: data.summaryItems),
            const SizedBox(height: AppSpacing.xxl),
            SectionHeader(
              title: 'Presupuestos · $budgetPeriod',
              actionLabel: 'Agregar',
              onActionTap: () => _openCreateBudgetSheet(context, ref),
            ),
            const SizedBox(height: AppSpacing.md),
            _BudgetsCard(
              budgets: budgets.value ?? const [],
              onAdd: () => _openCreateBudgetSheet(context, ref),
              onDelete: (budget) => _deleteBudget(ref, budget),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Movimientos recientes'),
            const SizedBox(height: AppSpacing.md),
            _MovementsCard(
              movements: data.movements,
              onMovementTap: (movement) =>
                  _openMovementDetail(context, ref, movement),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Pagos próximos'),
            const SizedBox(height: AppSpacing.md),
            _PaymentsCard(
              payments: data.upcomingPayments,
              onPaymentTap: (payment) =>
                  _openPaymentDetail(context, ref, payment),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Accesos a módulos'),
            const SizedBox(height: AppSpacing.md),
            _ModuleLinksGrid(links: data.moduleLinks),
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
                        if (action.label == '+ Gasto') {
                          _openCreateExpenseSheet(context, ref);
                          return;
                        }

                        if (action.label == '+ Ingreso') {
                          _openCreateIncomeSheet(context, ref);
                          return;
                        }

                        if (action.label == '+ Pago') {
                          _openCreatePaymentSheet(context, ref);
                          return;
                        }

                        if (action.label == '+ Deuda') {
                          _openCreateDebtSheet(context);
                          return;
                        }

                        _showSnackBar(context, 'Acción no disponible.');
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

class _AccountsCard extends StatelessWidget {
  const _AccountsCard({
    required this.accounts,
    required this.onAdd,
    required this.onDelete,
    required this.onTransfer,
  });

  final List<FinanceAccount> accounts;
  final VoidCallback onAdd;
  final ValueChanged<FinanceAccount> onDelete;
  final VoidCallback onTransfer;

  @override
  Widget build(BuildContext context) {
    if (accounts.isEmpty) {
      return EmptyStateCard(
        icon: Icons.account_balance_wallet_outlined,
        title: 'Agrega tu saldo inicial',
        description:
            'Registra dónde guardas tu dinero para calcular correctamente lo disponible.',
        actionLabel: 'Agregar cuenta',
        onAction: onAdd,
      );
    }
    return AppCard(
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: onTransfer,
              icon: const Icon(Icons.swap_horiz_rounded),
              label: const Text('Transferir'),
            ),
          ),
          for (final account in accounts) ...[
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: ModuleBadge(
                icon: _accountIcon(account.type),
                color: AppColors.finance,
                size: 40,
              ),
              title: Text(account.name),
              subtitle: Text(
                '${account.type} · Inicial ${money(account.initialBalance)}',
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    money(account.currentBalance),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  IconButton(
                    tooltip: 'Eliminar cuenta',
                    onPressed: () => onDelete(account),
                    icon: const Icon(Icons.delete_outline_rounded),
                  ),
                ],
              ),
            ),
            if (account != accounts.last) const Divider(),
          ],
        ],
      ),
    );
  }

  IconData _accountIcon(String type) => switch (type) {
    'Banco' => Icons.account_balance_rounded,
    'Tarjeta' => Icons.credit_card_rounded,
    'Ahorro' => Icons.savings_rounded,
    _ => Icons.payments_rounded,
  };
}

class _BudgetsCard extends StatelessWidget {
  const _BudgetsCard({
    required this.budgets,
    required this.onAdd,
    required this.onDelete,
  });

  final List<FinanceBudget> budgets;
  final VoidCallback onAdd;
  final ValueChanged<FinanceBudget> onDelete;

  @override
  Widget build(BuildContext context) {
    if (budgets.isEmpty) {
      return EmptyStateCard(
        icon: Icons.donut_large_rounded,
        title: 'Sin presupuestos',
        description:
            'Define un límite por categoría para saber cuánto puedes gastar.',
        actionLabel: 'Crear presupuesto',
        onAction: onAdd,
      );
    }
    return AppCard(
      child: Column(
        children: [
          for (final budget in budgets) ...[
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        budget.category,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    Text(
                      '${money(budget.spent)} de ${money(budget.limit)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    IconButton(
                      tooltip: 'Eliminar presupuesto',
                      onPressed: () => onDelete(budget),
                      icon: const Icon(Icons.close_rounded, size: 20),
                    ),
                  ],
                ),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: budget.progress,
                    minHeight: 9,
                    color: budget.exceeded
                        ? AppColors.danger
                        : budget.progress >= .8
                        ? AppColors.warning
                        : AppColors.finance,
                    backgroundColor: AppColors.borderLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  budget.exceeded
                      ? '${money(budget.remaining.abs())} por encima del límite'
                      : '${money(budget.remaining)} disponibles',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: budget.exceeded
                        ? AppColors.danger
                        : AppColors.textMuted,
                  ),
                ),
              ],
            ),
            if (budget != budgets.last)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                child: Divider(),
              ),
          ],
        ],
      ),
    );
  }
}

class _AvailableCard extends StatelessWidget {
  const _AvailableCard({required this.data});

  final MockFinancesData data;

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
            amount: data.availableAmount,
            label: data.availableLabel,
            color: Colors.white,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            data.availableDescription,
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textOnDarkSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: data.chips
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

class _FallbackNotice extends StatelessWidget {
  const _FallbackNotice();

  @override
  Widget build(BuildContext context) {
    return const AppCard(child: Text('No se pudieron cargar las finanzas.'));
  }
}

class _SummaryGrid extends StatelessWidget {
  const _SummaryGrid({required this.items});

  final List<MockFinanceSummaryItem> items;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      itemCount: items.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        childAspectRatio: 1.22,
      ),
      itemBuilder: (context, index) {
        final item = items[index];

        return AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ModuleBadge(icon: item.icon, color: item.color, size: 36),
              const Spacer(),
              MoneyAmount(
                amount: item.amount,
                label: item.label,
                variant: MoneyAmountVariant.compact,
                color: item.color,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MovementsCard extends StatelessWidget {
  const _MovementsCard({required this.movements, required this.onMovementTap});

  final List<MockFinanceMovement> movements;
  final ValueChanged<MockFinanceMovement> onMovementTap;

  @override
  Widget build(BuildContext context) {
    if (movements.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.receipt_long_rounded,
        title: 'Sin movimientos',
        description: 'Crea un gasto o ingreso para verlo aquí.',
      );
    }

    return AppCard(
      child: Column(
        children: [
          for (final movement in movements) ...[
            _MovementTile(
              movement: movement,
              onTap: () => onMovementTap(movement),
            ),
            if (movement != movements.last)
              const SizedBox(height: AppSpacing.lg),
          ],
        ],
      ),
    );
  }
}

class _MovementTile extends StatelessWidget {
  const _MovementTile({required this.movement, required this.onTap});

  final MockFinanceMovement movement;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final amountColor = movement.isIncome
        ? AppColors.success
        : AppColors.danger;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      child: Row(
        children: [
          ModuleBadge(icon: movement.icon, color: movement.color, size: 38),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(movement.title, style: textTheme.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '${movement.category} · ${movement.dateLabel}',
                  style: textTheme.bodySmall,
                ),
              ],
            ),
          ),
          SummaryChip(
            label: movement.isIncome ? 'Completado' : 'Pagado',
            color: movement.isIncome ? AppColors.success : AppColors.info,
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            movement.amount,
            style: textTheme.titleMedium?.copyWith(color: amountColor),
          ),
        ],
      ),
    );
  }
}

class _PaymentsCard extends StatelessWidget {
  const _PaymentsCard({required this.payments, required this.onPaymentTap});

  final List<MockFinancePayment> payments;
  final ValueChanged<MockFinancePayment> onPaymentTap;

  @override
  Widget build(BuildContext context) {
    if (payments.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.event_repeat_rounded,
        title: 'Sin pagos próximos',
        description: 'Agenda un pago para darle seguimiento.',
      );
    }

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

  final MockFinancePayment payment;
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
            label: 'Próximo',
            icon: Icons.schedule_rounded,
            color: AppColors.warning,
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(payment.amount, style: textTheme.titleMedium),
        ],
      ),
    );
  }
}

class _ModuleLinksGrid extends StatelessWidget {
  const _ModuleLinksGrid({required this.links});

  final List<MockFinanceModuleLink> links;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final link in links) ...[
          Expanded(
            child: AppCard(
              onTap: () => context.go(link.route),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ModuleBadge(icon: link.icon, color: link.color, size: 40),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    link.title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    link.subtitle,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
          if (link != links.last) const SizedBox(width: AppSpacing.md),
        ],
      ],
    );
  }
}
