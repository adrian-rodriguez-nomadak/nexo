import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/mock/mock_finances.dart';
import '../../../../shared/presentation/widgets/app_detail_sheet.dart';
import '../../../../shared/presentation/widgets/summary_chip.dart';

class UpcomingPaymentDetailSheet extends StatelessWidget {
  const UpcomingPaymentDetailSheet({
    required this.payment,
    required this.onAction,
    super.key,
  });

  final MockFinancePayment payment;
  final ValueChanged<String> onAction;

  static Future<void> show({
    required BuildContext context,
    required MockFinancePayment payment,
    required ValueChanged<String> onAction,
  }) {
    return AppDetailSheet.show<void>(
      context: context,
      builder: (context) =>
          UpcomingPaymentDetailSheet(payment: payment, onAction: onAction),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppDetailSheet(
      title: payment.title,
      subtitle: 'Pago próximo',
      icon: payment.icon,
      color: payment.color,
      primaryActionLabel: 'Marcar como pagado',
      onPrimaryAction: () => onAction('paid'),
      secondaryActionLabel: 'Editar',
      onSecondaryAction: () => onAction('edit'),
      dangerActionLabel: 'Eliminar',
      onDangerAction: () => onAction('delete'),
      children: [
        const Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            SummaryChip(
              label: 'Pendiente',
              icon: Icons.pending_actions_rounded,
              color: AppColors.warning,
            ),
            SummaryChip(
              label: 'Vence pronto',
              icon: Icons.schedule_rounded,
              color: AppColors.danger,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        _DetailRow(label: 'Monto', value: payment.amount),
        _DetailRow(label: 'Vencimiento', value: payment.dueLabel),
        const _DetailRow(label: 'Categoría', value: 'Pagos próximos'),
        const _DetailRow(label: 'Estado', value: 'Pendiente'),
        const SizedBox(height: AppSpacing.sm),
        OutlinedButton.icon(
          onPressed: () => onAction('postpone'),
          icon: const Icon(Icons.update_rounded),
          label: const Text('Posponer'),
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
          SizedBox(width: 108, child: Text(label, style: textTheme.bodySmall)),
          Expanded(child: Text(value, style: textTheme.labelLarge)),
        ],
      ),
    );
  }
}
