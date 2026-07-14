import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/mock/mock_subscriptions.dart';
import '../../../../shared/presentation/widgets/app_detail_sheet.dart';
import '../../../../shared/presentation/widgets/summary_chip.dart';

class SubscriptionDetailSheet extends StatelessWidget {
  const SubscriptionDetailSheet({
    required this.subscription,
    required this.onAction,
    super.key,
  });

  final MockSubscriptionItem subscription;
  final ValueChanged<String> onAction;

  static Future<void> show({
    required BuildContext context,
    required MockSubscriptionItem subscription,
    required ValueChanged<String> onAction,
  }) {
    return AppDetailSheet.show<void>(
      context: context,
      builder: (context) => SubscriptionDetailSheet(
        subscription: subscription,
        onAction: onAction,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppDetailSheet(
      title: subscription.name,
      subtitle: 'Suscripción activa',
      icon: subscription.icon,
      color: subscription.color,
      primaryActionLabel: 'Marcar como pagada',
      onPrimaryAction: () => onAction('active'),
      secondaryActionLabel: 'Editar',
      onSecondaryAction: () => onAction('edit'),
      dangerActionLabel: 'Cancelar suscripción',
      onDangerAction: () => onAction('delete'),
      children: [
        const Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            SummaryChip(
              label: 'Activa',
              icon: Icons.check_circle_rounded,
              color: AppColors.success,
            ),
            SummaryChip(
              label: 'Mensual',
              icon: Icons.repeat_rounded,
              color: AppColors.subscription,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        _DetailRow(label: 'Monto', value: subscription.amount),
        _DetailRow(label: 'Día de cobro', value: subscription.billingDay),
        const _DetailRow(label: 'Frecuencia', value: 'Mensual'),
        _DetailRow(label: 'Estado', value: subscription.status),
        const _DetailRow(label: 'Categoría', value: 'Servicio recurrente'),
        _DetailRow(label: 'Próximo cobro', value: subscription.billingDay),
        const _DetailRow(label: 'Notas', value: 'Cobro recurrente registrado.'),
        const SizedBox(height: AppSpacing.sm),
        OutlinedButton.icon(
          onPressed: () => onAction('paused'),
          icon: const Icon(Icons.pause_circle_outline_rounded),
          label: const Text('Pausar'),
        ),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 112, child: Text(label, style: textTheme.bodySmall)),
          Expanded(child: Text(value, style: textTheme.labelLarge)),
        ],
      ),
    );
  }
}
