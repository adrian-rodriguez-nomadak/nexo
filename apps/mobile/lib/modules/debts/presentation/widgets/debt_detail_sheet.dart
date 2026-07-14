import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/mock/mock_debts.dart';
import '../../../../shared/presentation/widgets/app_detail_sheet.dart';
import '../../../../shared/presentation/widgets/summary_chip.dart';
import 'create_debt_payment_sheet.dart';

class DebtDetailSheet extends StatelessWidget {
  const DebtDetailSheet({
    required this.item,
    required this.type,
    required this.onAction,
    super.key,
  });

  final MockDebtItem item;
  final String type;
  final ValueChanged<String> onAction;

  static Future<void> show({
    required BuildContext context,
    required MockDebtItem item,
    required String type,
    required ValueChanged<String> onAction,
  }) {
    return AppDetailSheet.show<void>(
      context: context,
      builder: (context) =>
          DebtDetailSheet(item: item, type: type, onAction: onAction),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppDetailSheet(
      title: item.name,
      subtitle: type,
      icon: item.icon,
      color: item.color,
      primaryActionLabel: 'Registrar pago',
      onPrimaryAction: () {
        CreateDebtPaymentSheet.show(
          context: context,
          onSaved: () => onAction('payment'),
        );
      },
      secondaryActionLabel: 'Editar',
      onSecondaryAction: () => onAction('edit'),
      dangerActionLabel: 'Eliminar',
      onDangerAction: () => onAction('delete'),
      children: [
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            SummaryChip(
              label: type,
              icon: type == 'Debo'
                  ? Icons.arrow_upward_rounded
                  : Icons.arrow_downward_rounded,
              color: type == 'Debo' ? AppColors.danger : AppColors.success,
            ),
            const SummaryChip(
              label: 'Pendiente',
              icon: Icons.pending_actions_rounded,
              color: AppColors.warning,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        _DetailRow(label: 'Monto total', value: item.amount),
        _DetailRow(label: 'Monto pendiente', value: item.amount),
        const _DetailRow(label: 'Fecha', value: 'Hoy'),
        const _DetailRow(label: 'Estado', value: 'Pendiente'),
        _DetailRow(label: 'Nota', value: item.detail),
        const _DetailRow(
          label: 'Último movimiento',
          value: 'Sin movimientos reales todavía.',
        ),
        const SizedBox(height: AppSpacing.sm),
        OutlinedButton.icon(
          onPressed: () => onAction('paid'),
          icon: const Icon(Icons.check_circle_rounded),
          label: const Text('Marcar como saldada'),
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
          SizedBox(width: 120, child: Text(label, style: textTheme.bodySmall)),
          Expanded(child: Text(value, style: textTheme.labelLarge)),
        ],
      ),
    );
  }
}
