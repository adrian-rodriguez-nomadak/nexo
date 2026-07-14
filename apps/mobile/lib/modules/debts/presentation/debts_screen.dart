import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../application/debts_providers.dart';
import '../data/repositories/local_debts_repository.dart';
import '../../../shared/mock/mock_debts.dart';
import '../../../shared/presentation/widgets/app_back_button.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/money_amount.dart';
import '../../../shared/presentation/widgets/quick_action_button.dart';
import '../../../shared/presentation/widgets/section_header.dart';
import '../../../shared/presentation/widgets/summary_chip.dart';
import '../../../shared/presentation/widgets/empty_state_card.dart';
import 'widgets/create_debt_from_debts_sheet.dart';
import 'widgets/create_debt_payment_sheet.dart';
import 'widgets/debt_detail_sheet.dart';
import 'debts_view_data.dart';

class DebtsScreen extends ConsumerWidget {
  const DebtsScreen({super.key});

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

  void _openCreateDebtSheet(BuildContext context, WidgetRef ref, String type) {
    CreateDebtFromDebtsSheet.show(
      context: context,
      initialType: type,
      onSave: (draft) => _saveDebt(context, ref, draft),
    );
  }

  void _openCreateDebtPaymentSheet(BuildContext context, WidgetRef ref) {
    final debts = ref.read(debtsProvider).value;
    if (debts == null || debts.isEmpty) {
      _showSnackBar(context, 'Primero registra una deuda');
      return;
    }
    final debt = debts.first;
    CreateDebtPaymentSheet.show(
      context: context,
      debtName: debt.name,
      onSave: (draft) => _saveDebtPayment(context, ref, debt.id, draft),
    );
  }

  void _openDebtDetail(
    BuildContext context,
    WidgetRef ref,
    MockDebtItem item,
    String type,
  ) {
    DebtDetailSheet.show(
      context: context,
      item: item,
      type: type,
      onAction: (action) => _handleDebtAction(context, ref, item, action),
      onPayment: (draft) async {
        if (item.id == null) {
          _showSnackBar(context, 'Registra una deuda real primero');
          return;
        }
        await _saveDebtPayment(context, ref, item.id!, draft);
      },
    );
  }

  Future<void> _handleDebtAction(
    BuildContext context,
    WidgetRef ref,
    MockDebtItem item,
    String action,
  ) async {
    final repository = ref.read(debtsRepositoryProvider);
    if (item.id == null || repository is! LocalDebtsRepository) return;
    Navigator.of(context).pop();
    try {
      if (action == 'delete') await repository.deleteDebt(item.id!);
      if (action == 'paid') await repository.markAsPaid(item.id!);
      if (action == 'edit') {
        final source = ref
            .read(debtsProvider)
            .value
            ?.where((value) => value.id == item.id)
            .firstOrNull;
        if (source != null && context.mounted) {
          await CreateDebtFromDebtsSheet.show(
            context: context,
            initialType: source.type == 'they_owe_me' ? 'Me deben' : 'Debo',
            initialDraft: DebtDraft(
              name: source.name,
              amount: source.totalAmount,
              type: source.type == 'they_owe_me' ? 'Me deben' : 'Debo',
              notes: source.notes ?? '',
            ),
            onSave: (draft) async {
              await repository.updateDebt(
                id: item.id!,
                name: draft.name,
                type: draft.type == 'Me deben' ? 'they_owe_me' : 'i_owe',
                amount: draft.amount,
                notes: draft.notes,
              );
              ref.invalidate(debtsProvider);
            },
          );
        }
        return;
      }
      ref.invalidate(debtsProvider);
      if (context.mounted) {
        _showSnackBar(
          context,
          action == 'delete' ? 'Deuda eliminada' : 'Deuda actualizada',
        );
      }
    } catch (_) {
      if (context.mounted) _showSnackBar(context, 'No se pudo actualizar');
    }
  }

  Future<void> _saveDebt(
    BuildContext context,
    WidgetRef ref,
    DebtDraft draft,
  ) async {
    final repository = ref.read(debtsRepositoryProvider);
    if (repository is! LocalDebtsRepository) {
      _showSnackBar(context, 'Deuda simulada guardada');
      return;
    }

    try {
      await repository.createDebt(
        name: draft.name,
        type: draft.type == 'Me deben' ? 'they_owe_me' : 'i_owe',
        amount: draft.amount,
        notes: draft.notes,
      );
      if (!context.mounted) return;
      ref.invalidate(debtsProvider);
      _showSnackBar(context, 'Guardado localmente');
    } catch (_) {
      _showSnackBar(context, 'No se pudo guardar localmente');
    }
  }

  Future<void> _saveDebtPayment(
    BuildContext context,
    WidgetRef ref,
    String debtId,
    DebtPaymentDraft draft,
  ) async {
    final repository = ref.read(debtsRepositoryProvider);
    if (repository is! LocalDebtsRepository) return;

    try {
      await repository.createPayment(
        debtId: debtId,
        amount: draft.amount,
        notes: draft.notes,
      );
      if (!context.mounted) return;
      ref.invalidate(debtsProvider);
      _showSnackBar(context, 'Guardado localmente');
    } catch (_) {
      _showSnackBar(context, 'No se pudo guardar localmente');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final debts = ref.watch(debtsProvider);
    final data = debts.value == null
        ? mockDebts
        : buildDebtsViewData(debts.value!);
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
                const AppBackButton(fallbackLocation: '/finances'),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Deudas', style: textTheme.headlineLarge),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Controla lo que debes y lo que te deben.',
                        style: textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const ModuleBadge(
                  icon: Icons.receipt_long_rounded,
                  color: AppColors.primaryDark,
                  backgroundColor: AppColors.primary,
                  size: 48,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            if (debts.isLoading) ...[
              const Center(child: CircularProgressIndicator()),
              const SizedBox(height: AppSpacing.xl),
            ],
            if (debts.hasError) ...[
              const AppCard(child: Text('Usando datos de prototipo')),
              const SizedBox(height: AppSpacing.xl),
            ],
            _DebtHeroCard(data: data),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Debo'),
            const SizedBox(height: AppSpacing.md),
            _DebtList(
              items: data.iOwe,
              amountColor: AppColors.danger,
              statusLabel: 'Pendiente',
              onDebtTap: (item) => _openDebtDetail(context, ref, item, 'Debo'),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Me deben'),
            const SizedBox(height: AppSpacing.md),
            _DebtList(
              items: data.owedToMe,
              amountColor: AppColors.success,
              statusLabel: 'Por cobrar',
              onDebtTap: (item) =>
                  _openDebtDetail(context, ref, item, 'Me deben'),
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
                        if (action.label == '+ Deuda') {
                          _openCreateDebtSheet(context, ref, 'Debo');
                          return;
                        }

                        if (action.label == '+ Me deben') {
                          _openCreateDebtSheet(context, ref, 'Me deben');
                          return;
                        }

                        if (action.label == '+ Pago') {
                          _openCreateDebtPaymentSheet(context, ref);
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

class _DebtHeroCard extends StatelessWidget {
  const _DebtHeroCard({required this.data});

  final MockDebtsData data;

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
            amount: data.balance,
            label: data.balanceLabel,
            color: AppColors.debt,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            data.description,
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

class _DebtList extends StatelessWidget {
  const _DebtList({
    required this.items,
    required this.amountColor,
    required this.statusLabel,
    required this.onDebtTap,
  });

  final List<MockDebtItem> items;
  final Color amountColor;
  final String statusLabel;
  final ValueChanged<MockDebtItem> onDebtTap;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.receipt_long_rounded,
        title: 'Sin deudas',
        description: 'Registra una deuda o un cobro pendiente.',
      );
    }

    return AppCard(
      child: Column(
        children: [
          for (final item in items) ...[
            _DebtTile(
              item: item,
              amountColor: amountColor,
              statusLabel: statusLabel,
              onTap: () => onDebtTap(item),
            ),
            if (item != items.last) const SizedBox(height: AppSpacing.lg),
          ],
        ],
      ),
    );
  }
}

class _DebtTile extends StatelessWidget {
  const _DebtTile({
    required this.item,
    required this.amountColor,
    required this.statusLabel,
    required this.onTap,
  });

  final MockDebtItem item;
  final Color amountColor;
  final String statusLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      child: Row(
        children: [
          ModuleBadge(icon: item.icon, color: item.color, size: 38),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.name, style: textTheme.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(item.detail, style: textTheme.bodySmall),
              ],
            ),
          ),
          SummaryChip(
            label: statusLabel,
            icon: Icons.pending_actions_rounded,
            color: amountColor,
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            item.amount,
            style: textTheme.titleMedium?.copyWith(color: amountColor),
          ),
        ],
      ),
    );
  }
}
