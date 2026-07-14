import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../application/subscriptions_providers.dart';
import '../data/repositories/local_subscriptions_repository.dart';
import '../../../shared/mock/mock_subscriptions.dart';
import '../../../shared/presentation/widgets/app_back_button.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/money_amount.dart';
import '../../../shared/presentation/widgets/quick_action_button.dart';
import '../../../shared/presentation/widgets/section_header.dart';
import '../../../shared/presentation/widgets/summary_chip.dart';
import '../../../shared/presentation/widgets/empty_state_card.dart';
import 'widgets/create_subscription_sheet.dart';
import 'widgets/subscription_detail_sheet.dart';
import 'subscriptions_view_data.dart';

class SubscriptionsScreen extends ConsumerWidget {
  const SubscriptionsScreen({super.key});

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  void _openCreateSubscriptionSheet(BuildContext context, WidgetRef ref) {
    CreateSubscriptionSheet.show(
      context: context,
      onSave: (draft) => _saveSubscription(context, ref, draft),
    );
  }

  Future<void> _saveSubscription(
    BuildContext context,
    WidgetRef ref,
    SubscriptionDraft draft,
  ) async {
    final repository = ref.read(subscriptionsRepositoryProvider);
    if (repository is! LocalSubscriptionsRepository) {
      _showSnackBar(
        context,
        'No se puede guardar con la fuente de datos actual',
      );
      return;
    }

    try {
      await repository.createSubscription(
        name: draft.name,
        amount: draft.amount,
        billingDay: draft.billingDay,
        category: draft.category,
      );
      if (!context.mounted) return;
      ref.invalidate(subscriptionsProvider);
      _showSnackBar(context, 'Guardado localmente');
    } catch (_) {
      _showSnackBar(context, 'No se pudo guardar localmente');
    }
  }

  void _openSubscriptionDetail(
    BuildContext context,
    WidgetRef ref,
    MockSubscriptionItem subscription,
  ) {
    SubscriptionDetailSheet.show(
      context: context,
      subscription: subscription,
      onAction: (action) =>
          _handleSubscriptionAction(context, ref, subscription, action),
    );
  }

  Future<void> _handleSubscriptionAction(
    BuildContext context,
    WidgetRef ref,
    MockSubscriptionItem item,
    String action,
  ) async {
    final repository = ref.read(subscriptionsRepositoryProvider);
    if (item.id == null || repository is! LocalSubscriptionsRepository) return;
    Navigator.of(context).pop();
    try {
      if (action == 'delete') {
        await repository.deleteSubscription(item.id!);
      } else if (action == 'paused' || action == 'active') {
        await repository.updateStatus(item.id!, action);
      } else if (action == 'edit') {
        final source = ref
            .read(subscriptionsProvider)
            .value
            ?.where((value) => value.id == item.id)
            .firstOrNull;
        if (source != null && context.mounted) {
          await CreateSubscriptionSheet.show(
            context: context,
            initialDraft: SubscriptionDraft(
              name: source.name,
              amount: source.amount,
              billingDay: source.billingDay,
              category: source.category ?? '',
            ),
            onSave: (draft) async {
              await repository.updateSubscription(
                id: item.id!,
                name: draft.name,
                amount: draft.amount,
                billingDay: draft.billingDay,
                category: draft.category,
              );
              ref.invalidate(subscriptionsProvider);
            },
          );
        }
        return;
      }
      ref.invalidate(subscriptionsProvider);
      if (context.mounted) {
        _showSnackBar(
          context,
          action == 'delete'
              ? 'Suscripción eliminada'
              : 'Suscripción actualizada',
        );
      }
    } catch (_) {
      if (context.mounted) _showSnackBar(context, 'No se pudo actualizar');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptions = ref.watch(subscriptionsProvider);
    final data = buildSubscriptionsViewData(subscriptions.value ?? const []);
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
                      Text('Suscripciones', style: textTheme.headlineLarge),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Controla tus cobros recurrentes y pagos fijos.',
                        style: textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const ModuleBadge(
                  icon: Icons.subscriptions_rounded,
                  color: AppColors.primaryDark,
                  backgroundColor: AppColors.primary,
                  size: 48,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            if (subscriptions.isLoading) ...[
              const Center(child: CircularProgressIndicator()),
              const SizedBox(height: AppSpacing.xl),
            ],
            if (subscriptions.hasError) ...[
              const AppCard(
                child: Text('No se pudieron cargar las suscripciones.'),
              ),
              const SizedBox(height: AppSpacing.xl),
            ],
            _SubscriptionHeroCard(data: data),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Lista de suscripciones'),
            const SizedBox(height: AppSpacing.md),
            _SubscriptionsList(
              items: data.subscriptions,
              onSubscriptionTap: (subscription) =>
                  _openSubscriptionDetail(context, ref, subscription),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Próximos cobros'),
            const SizedBox(height: AppSpacing.md),
            _UpcomingChargesList(charges: data.upcomingCharges),
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
                        if (action.label == '+ Suscripción') {
                          _openCreateSubscriptionSheet(context, ref);
                          return;
                        }

                        _showSnackBar(
                          context,
                          'Registra el pago desde la sección Finanzas.',
                        );
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

class _SubscriptionHeroCard extends StatelessWidget {
  const _SubscriptionHeroCard({required this.data});

  final MockSubscriptionsData data;

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
            amount: data.monthlyTotal,
            label: data.monthlyLabel,
            color: Colors.white,
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

class _SubscriptionsList extends StatelessWidget {
  const _SubscriptionsList({
    required this.items,
    required this.onSubscriptionTap,
  });

  final List<MockSubscriptionItem> items;
  final ValueChanged<MockSubscriptionItem> onSubscriptionTap;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.subscriptions_rounded,
        title: 'Sin suscripciones',
        description: 'Agrega tus cobros recurrentes para verlos aquí.',
      );
    }

    return AppCard(
      child: Column(
        children: [
          for (final item in items) ...[
            _SubscriptionTile(item: item, onTap: () => onSubscriptionTap(item)),
            if (item != items.last) const SizedBox(height: AppSpacing.lg),
          ],
        ],
      ),
    );
  }
}

class _SubscriptionTile extends StatelessWidget {
  const _SubscriptionTile({required this.item, required this.onTap});

  final MockSubscriptionItem item;
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
                Text(item.billingDay, style: textTheme.bodySmall),
              ],
            ),
          ),
          const SummaryChip(
            label: 'Activa',
            icon: Icons.check_circle_rounded,
            color: AppColors.success,
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(item.amount, style: textTheme.titleMedium),
        ],
      ),
    );
  }
}

class _UpcomingChargesList extends StatelessWidget {
  const _UpcomingChargesList({required this.charges});

  final List<MockUpcomingCharge> charges;

  @override
  Widget build(BuildContext context) {
    if (charges.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.payments_rounded,
        title: 'Sin próximos cobros',
        description: 'Tus próximos cargos aparecerán en esta sección.',
      );
    }

    return AppCard(
      child: Column(
        children: [
          for (final charge in charges) ...[
            _UpcomingChargeTile(charge: charge),
            if (charge != charges.last) const SizedBox(height: AppSpacing.lg),
          ],
        ],
      ),
    );
  }
}

class _UpcomingChargeTile extends StatelessWidget {
  const _UpcomingChargeTile({required this.charge});

  final MockUpcomingCharge charge;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        ModuleBadge(icon: charge.icon, color: charge.color, size: 38),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(charge.name, style: textTheme.titleMedium),
              const SizedBox(height: AppSpacing.xs),
              Text(charge.dueLabel, style: textTheme.bodySmall),
            ],
          ),
        ),
        Text(charge.amount, style: textTheme.titleMedium),
      ],
    );
  }
}
