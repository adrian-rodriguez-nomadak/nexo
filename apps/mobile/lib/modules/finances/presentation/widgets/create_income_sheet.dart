import 'package:flutter/material.dart';
import '../../../../core/utils/formatters.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class IncomeDraft {
  const IncomeDraft({
    required this.amount,
    required this.source,
    required this.description,
  });
  final double amount;
  final String source;
  final String description;
}

class CreateIncomeSheet extends StatefulWidget {
  const CreateIncomeSheet({this.onSave, this.initialValue, super.key});

  final ValueChanged<IncomeDraft>? onSave;
  final IncomeDraft? initialValue;

  static Future<void> show({
    required BuildContext context,
    ValueChanged<IncomeDraft>? onSave,
    IncomeDraft? initialValue,
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) =>
          CreateIncomeSheet(onSave: onSave, initialValue: initialValue),
    );
  }

  @override
  State<CreateIncomeSheet> createState() => _CreateIncomeSheetState();
}

class _CreateIncomeSheetState extends State<CreateIncomeSheet> {
  final _amountController = TextEditingController();
  final _sourceController = TextEditingController();
  final _descriptionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final initial = widget.initialValue;
    if (initial != null) {
      _amountController.text = initial.amount.toString();
      _sourceController.text = initial.source;
      _descriptionController.text = initial.description;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _sourceController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _saveIncome() {
    final amount = double.tryParse(
      _amountController.text.replaceAll(RegExp(r'[^0-9.]'), ''),
    );
    if (amount == null || amount <= 0) return;
    widget.onSave?.call(
      IncomeDraft(
        amount: amount,
        source: _sourceController.text.trim(),
        description: _descriptionController.text.trim(),
      ),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: 'Nuevo ingreso',
      subtitle: 'Registra un ingreso y actualiza tu disponible.',
      primaryActionLabel: 'Guardar ingreso',
      onPrimaryAction: _saveIncome,
      secondaryActionLabel: 'Cancelar',
      onSecondaryAction: () => Navigator.of(context).pop(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Monto',
            hint: moneyInputHint,
            controller: _amountController,
            keyboardType: TextInputType.number,
            prefixIcon: Icons.payments_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Fuente',
            hint: 'Nómina, freelance, venta...',
            controller: _sourceController,
            prefixIcon: Icons.account_balance_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Descripción',
            hint: 'Ej. pago de proyecto',
            controller: _descriptionController,
            prefixIcon: Icons.notes_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          const _DatePreviewField(),
        ],
      ),
    );
  }
}

class _DatePreviewField extends StatelessWidget {
  const _DatePreviewField();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Fecha', style: textTheme.labelLarge),
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
              const ModuleBadge(
                icon: Icons.today_rounded,
                color: AppColors.primaryDark,
                size: 34,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(child: Text('Hoy', style: textTheme.titleMedium)),
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
