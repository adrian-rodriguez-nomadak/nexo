import 'package:flutter/material.dart';
import '../../../../core/utils/formatters.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class PaymentDraft {
  const PaymentDraft({
    required this.name,
    required this.amount,
    required this.category,
    required this.dueDate,
  });
  final String name;
  final double amount;
  final String category;
  final DateTime dueDate;
}

class CreatePaymentSheet extends StatefulWidget {
  const CreatePaymentSheet({this.onSave, this.initialValue, super.key});

  final ValueChanged<PaymentDraft>? onSave;
  final PaymentDraft? initialValue;

  static Future<void> show({
    required BuildContext context,
    ValueChanged<PaymentDraft>? onSave,
    PaymentDraft? initialValue,
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) =>
          CreatePaymentSheet(onSave: onSave, initialValue: initialValue),
    );
  }

  @override
  State<CreatePaymentSheet> createState() => _CreatePaymentSheetState();
}

class _CreatePaymentSheetState extends State<CreatePaymentSheet> {
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  final _categoryController = TextEditingController();
  late DateTime _dueDate;

  @override
  void initState() {
    super.initState();
    final initial = widget.initialValue;
    _dueDate = initial?.dueDate ?? DateTime.now().add(const Duration(days: 3));
    if (initial != null) {
      _nameController.text = initial.name;
      _amountController.text = initial.amount.toString();
      _categoryController.text = initial.category;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _categoryController.dispose();
    super.dispose();
  }

  void _savePayment() {
    final amount = double.tryParse(
      _amountController.text.replaceAll(RegExp(r'[^0-9.]'), ''),
    );
    final name = _nameController.text.trim();
    if (amount == null || amount <= 0 || name.isEmpty) return;
    widget.onSave?.call(
      PaymentDraft(
        name: name,
        amount: amount,
        category: _categoryController.text.trim(),
        dueDate: _dueDate,
      ),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: 'Nuevo pago próximo',
      subtitle: 'Agenda un pago pendiente para darle seguimiento.',
      primaryActionLabel: 'Guardar pago',
      onPrimaryAction: _savePayment,
      secondaryActionLabel: 'Cancelar',
      onSecondaryAction: () => Navigator.of(context).pop(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Nombre del pago',
            hint: 'Internet, tarjeta, renta...',
            controller: _nameController,
            prefixIcon: Icons.receipt_long_rounded,
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
          _DatePreviewField(
            date: _dueDate,
            onTap: () async {
              final selected = await showDatePicker(
                context: context,
                initialDate: _dueDate,
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 3650)),
              );
              if (selected != null) setState(() => _dueDate = selected);
            },
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Categoría',
            hint: 'Servicios, tarjeta, suscripción...',
            controller: _categoryController,
            prefixIcon: Icons.category_rounded,
          ),
        ],
      ),
    );
  }
}

class _DatePreviewField extends StatelessWidget {
  const _DatePreviewField({required this.date, required this.onTap});

  final DateTime date;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Fecha', style: textTheme.labelLarge),
        const SizedBox(height: AppSpacing.sm),
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
          child: Container(
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
                  icon: Icons.event_rounded,
                  color: AppColors.subscription,
                  size: 34,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(shortDate(date), style: textTheme.titleMedium),
                ),
                const Icon(
                  Icons.expand_more_rounded,
                  color: AppColors.textMuted,
                  size: 22,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
