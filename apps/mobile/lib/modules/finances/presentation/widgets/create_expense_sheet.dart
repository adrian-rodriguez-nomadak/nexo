import 'package:flutter/material.dart';
import '../../../../core/utils/formatters.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class ExpenseDraft {
  const ExpenseDraft({
    required this.amount,
    required this.category,
    required this.description,
  });
  final double amount;
  final String category;
  final String description;
}

class CreateExpenseSheet extends StatefulWidget {
  const CreateExpenseSheet({
    this.onSave,
    this.initialValue,
    this.categories = const [],
    super.key,
  });

  final ValueChanged<ExpenseDraft>? onSave;
  final ExpenseDraft? initialValue;
  final List<String> categories;

  static Future<void> show({
    required BuildContext context,
    ValueChanged<ExpenseDraft>? onSave,
    ExpenseDraft? initialValue,
    List<String> categories = const [],
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) => CreateExpenseSheet(
        onSave: onSave,
        initialValue: initialValue,
        categories: categories,
      ),
    );
  }

  @override
  State<CreateExpenseSheet> createState() => _CreateExpenseSheetState();
}

class _CreateExpenseSheetState extends State<CreateExpenseSheet> {
  final _amountController = TextEditingController();
  final _categoryController = TextEditingController();
  final _descriptionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final initial = widget.initialValue;
    if (initial != null) {
      _amountController.text = initial.amount.toString();
      _categoryController.text = initial.category;
      _descriptionController.text = initial.description;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _categoryController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _saveExpense() {
    final amount = double.tryParse(
      _amountController.text.replaceAll(RegExp(r'[^0-9.]'), ''),
    );
    if (amount == null || amount <= 0) return;
    widget.onSave?.call(
      ExpenseDraft(
        amount: amount,
        category: _categoryController.text.trim(),
        description: _descriptionController.text.trim(),
      ),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: 'Nuevo gasto',
      subtitle: 'Registra un gasto y actualiza tu disponible.',
      primaryActionLabel: 'Guardar gasto',
      onPrimaryAction: _saveExpense,
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
            label: 'Categoría',
            hint: 'Comida, transporte, salud...',
            controller: _categoryController,
            prefixIcon: Icons.category_rounded,
          ),
          if (widget.categories.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.xs,
              children: widget.categories
                  .map(
                    (category) => ActionChip(
                      label: Text(category),
                      onPressed: () =>
                          setState(() => _categoryController.text = category),
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Descripción',
            hint: 'Ej. comida con amigos',
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
