import 'package:flutter/material.dart';
import '../../../../core/utils/formatters.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class CreateDebtPaymentSheet extends StatefulWidget {
  const CreateDebtPaymentSheet({this.onSaved, this.onSave, super.key});

  final VoidCallback? onSaved;
  final VoidCallback? onSave;

  static Future<void> show({
    required BuildContext context,
    VoidCallback? onSaved,
    VoidCallback? onSave,
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) =>
          CreateDebtPaymentSheet(onSaved: onSaved, onSave: onSave),
    );
  }

  @override
  State<CreateDebtPaymentSheet> createState() => _CreateDebtPaymentSheetState();
}

class _CreateDebtPaymentSheetState extends State<CreateDebtPaymentSheet> {
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _savePayment() {
    Navigator.of(context).pop();
    (widget.onSave ?? widget.onSaved)?.call();
  }

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: 'Registrar pago',
      subtitle: 'Simula un abono a una deuda.',
      primaryActionLabel: 'Guardar pago',
      onPrimaryAction: _savePayment,
      secondaryActionLabel: 'Cancelar',
      onSecondaryAction: () => Navigator.of(context).pop(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _VisualField(
            label: 'Deuda',
            value: 'Tarjeta Nu',
            icon: Icons.credit_card_rounded,
            color: AppColors.debt,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Monto',
            hint: moneyInputHint,
            controller: _amountController,
            keyboardType: TextInputType.number,
            prefixIcon: Icons.payments_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          const _VisualField(
            label: 'Fecha',
            value: 'Hoy',
            icon: Icons.today_rounded,
            color: AppColors.primaryDark,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Nota',
            hint: 'Ej. abono parcial',
            controller: _noteController,
            prefixIcon: Icons.notes_rounded,
            maxLines: 2,
          ),
        ],
      ),
    );
  }
}

class _VisualField extends StatelessWidget {
  const _VisualField({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: textTheme.labelLarge),
        const SizedBox(height: AppSpacing.sm),
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.md,
          ),
          decoration: BoxDecoration(
            color: Theme.of(context).inputDecorationTheme.fillColor,
            borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Row(
            children: [
              ModuleBadge(icon: icon, color: color, size: 34),
              const SizedBox(width: AppSpacing.md),
              Expanded(child: Text(value, style: textTheme.titleMedium)),
              const Icon(
                Icons.expand_more_rounded,
                color: AppColors.textMuted,
                size: 22,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
