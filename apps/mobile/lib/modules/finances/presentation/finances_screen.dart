import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../application/finances_providers.dart';
import '../data/repositories/local_finances_repository.dart';
import '../../../shared/mock/mock_finances.dart';
import '../../../shared/presentation/widgets/app_back_button.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/money_amount.dart';
import '../../../shared/presentation/widgets/quick_action_button.dart';
import '../../../shared/presentation/widgets/section_header.dart';
import '../../../shared/presentation/widgets/summary_chip.dart';
import '../../../shared/presentation/widgets/empty_state_card.dart';
import 'widgets/create_debt_sheet.dart';
import 'widgets/create_expense_sheet.dart';
import 'widgets/create_income_sheet.dart';
import 'widgets/create_payment_sheet.dart';
import 'finance_view_data.dart';
import 'widgets/finance_movement_detail_sheet.dart';
import 'widgets/upcoming_payment_detail_sheet.dart';

class FinancesScreen extends ConsumerWidget {
  const FinancesScreen({super.key});

  void _showSimulatedAction(BuildContext context, String label) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('$label simulado')));
  }

  void _openCreateExpenseSheet(BuildContext context, WidgetRef ref) {
    CreateExpenseSheet.show(
      context: context,
      onSave: (draft) => _saveMovement(
        context,
        ref,
        type: 'expense',
        amount: draft.amount,
        description: draft.description,
        categoryName: draft.category,
      ),
    );
  }

  void _openCreateIncomeSheet(BuildContext context, WidgetRef ref) {
    CreateIncomeSheet.show(
      context: context,
      onSave: (draft) => _saveMovement(
        context,
        ref,
        type: 'income',
        amount: draft.amount,
        description: draft.description,
        categoryName: draft.source,
      ),
    );
  }

  void _openCreatePaymentSheet(BuildContext context, WidgetRef ref) {
    CreatePaymentSheet.show(
      context: context,
      onSave: (draft) => _savePayment(context, ref, draft),
    );
  }

  void _openCreateDebtSheet(BuildContext context) {
    CreateDebtSheet.show(
      context: context,
      onSaved: () => _showSnackBar(context, 'Deuda simulada guardada'),
    );
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
      ..invalidate(financeMovementsProvider);
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
      ..invalidate(financeMovementsProvider);
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
      );
      if (!context.mounted) return;
      ref.invalidate(financeSummaryProvider);
      ref.invalidate(financeMovementsProvider);
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
      _showSnackBar(context, 'Pago simulado guardado');
      return;
    }

    try {
      await repository.createUpcomingPayment(
        name: draft.name,
        amount: draft.amount,
        category: draft.category,
      );
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
        : mockFinances;
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
            _SummaryGrid(items: data.summaryItems),
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
    return const AppCard(child: Text('Usando datos de prototipo'));
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
