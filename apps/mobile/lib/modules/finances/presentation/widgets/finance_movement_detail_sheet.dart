import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/mock/mock_finances.dart';
import '../../../../shared/presentation/widgets/app_detail_sheet.dart';
import '../../../../shared/presentation/widgets/summary_chip.dart';

class FinanceMovementDetailSheet extends StatelessWidget {
  const FinanceMovementDetailSheet({
    required this.movement,
    required this.onAction,
    super.key,
  });

  final MockFinanceMovement movement;
  final ValueChanged<String> onAction;

  static Future<void> show({
    required BuildContext context,
    required MockFinanceMovement movement,
    required ValueChanged<String> onAction,
  }) {
    return AppDetailSheet.show<void>(
      context: context,
      builder: (context) =>
          FinanceMovementDetailSheet(movement: movement, onAction: onAction),
    );
  }

  @override
  Widget build(BuildContext context) {
    final type = movement.isIncome ? 'Ingreso' : 'Gasto';

    return AppDetailSheet(
      title: movement.title,
      subtitle: movement.category,
      icon: movement.icon,
      color: movement.color,
      primaryActionLabel: 'Editar',
      onPrimaryAction: () => onAction('edit'),
      secondaryActionLabel: 'Duplicar',
      onSecondaryAction: () => onAction('duplicate'),
      dangerActionLabel: 'Eliminar',
      onDangerAction: () => onAction('delete'),
      children: [
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            SummaryChip(
              label: type,
              icon: movement.isIncome
                  ? Icons.arrow_downward_rounded
                  : Icons.arrow_upward_rounded,
              color: movement.isIncome ? AppColors.success : AppColors.danger,
            ),
            const SummaryChip(
              label: 'Tarjeta',
              icon: Icons.credit_card_rounded,
              color: AppColors.info,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        _DetailRow(label: 'Monto', value: movement.amount),
        _DetailRow(label: 'Fecha', value: movement.dateLabel),
        _DetailRow(label: 'Categoría', value: movement.category),
        const _DetailRow(
          label: 'Descripción',
          value: 'Movimiento de prototipo para revisar el detalle visual.',
        ),
        const _DetailRow(label: 'Método', value: 'Tarjeta / Efectivo'),
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
