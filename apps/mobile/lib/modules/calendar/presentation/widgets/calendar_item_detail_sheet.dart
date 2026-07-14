import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_detail_sheet.dart';
import '../../../../shared/presentation/widgets/summary_chip.dart';

class CalendarItemDetailSheet extends StatelessWidget {
  const CalendarItemDetailSheet({
    required this.title,
    required this.type,
    required this.icon,
    required this.color,
    required this.date,
    required this.time,
    required this.category,
    required this.notes,
    required this.status,
    required this.primaryActionLabel,
    required this.secondaryActionLabel,
    required this.extraActionLabel,
    required this.onAction,
    super.key,
  });

  final String title;
  final String type;
  final IconData icon;
  final Color color;
  final String date;
  final String time;
  final String category;
  final String notes;
  final String status;
  final String primaryActionLabel;
  final String secondaryActionLabel;
  final String extraActionLabel;
  final ValueChanged<String> onAction;

  static Future<void> show({
    required BuildContext context,
    required CalendarItemDetailSheet sheet,
  }) {
    return AppDetailSheet.show<void>(
      context: context,
      builder: (context) => sheet,
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppDetailSheet(
      title: title,
      subtitle: type,
      icon: icon,
      color: color,
      primaryActionLabel: primaryActionLabel,
      onPrimaryAction: () => onAction('primary'),
      secondaryActionLabel: secondaryActionLabel,
      onSecondaryAction: () => onAction('secondary'),
      dangerActionLabel: 'Eliminar',
      onDangerAction: () => onAction('delete'),
      children: [
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            SummaryChip(
              label: status,
              icon: status == 'Completado'
                  ? Icons.check_circle_rounded
                  : Icons.pending_actions_rounded,
              color: status == 'Completado'
                  ? AppColors.success
                  : AppColors.warning,
            ),
            SummaryChip(label: type, icon: icon, color: color),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        _DetailRow(label: 'Fecha', value: date),
        _DetailRow(label: 'Hora', value: time),
        _DetailRow(label: 'Categoría', value: category),
        _DetailRow(label: 'Notas', value: notes),
        _DetailRow(label: 'Estado', value: status),
        const SizedBox(height: AppSpacing.sm),
        OutlinedButton.icon(
          onPressed: () => onAction('extra'),
          icon: const Icon(Icons.tune_rounded),
          label: Text(extraActionLabel),
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
          SizedBox(width: 96, child: Text(label, style: textTheme.bodySmall)),
          Expanded(child: Text(value, style: textTheme.labelLarge)),
        ],
      ),
    );
  }
}
