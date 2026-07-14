import 'package:flutter/material.dart';
import '../../../../core/utils/formatters.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class DebtPaymentDraft {
  const DebtPaymentDraft({required this.amount, required this.notes});

  final double amount;
  final String notes;
}

class CreateDebtPaymentSheet extends StatefulWidget {
  const CreateDebtPaymentSheet({
    required this.debtName,
    required this.onSave,
    super.key,
  });

  final String debtName;
  final Future<void> Function(DebtPaymentDraft draft) onSave;

  static Future<void> show({
    required BuildContext context,
    required String debtName,
    required Future<void> Function(DebtPaymentDraft draft) onSave,
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) =>
          CreateDebtPaymentSheet(debtName: debtName, onSave: onSave),
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

  Future<void> _savePayment() async {
    final amount = double.tryParse(_amountController.text.replaceAll(',', ''));
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Ingresa un monto válido')));
      return;
    }
    await widget.onSave(
      DebtPaymentDraft(amount: amount, notes: _noteController.text.trim()),
    );
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: 'Registrar pago',
      subtitle: 'Registra un abono y actualiza el monto pendiente.',
      primaryActionLabel: 'Guardar pago',
      onPrimaryAction: _savePayment,
      secondaryActionLabel: 'Cancelar',
      onSecondaryAction: () => Navigator.of(context).pop(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _VisualField(
            label: 'Deuda',
            value: widget.debtName,
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
