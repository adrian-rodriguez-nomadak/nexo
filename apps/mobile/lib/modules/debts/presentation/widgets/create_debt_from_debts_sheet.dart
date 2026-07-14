import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class DebtDraft {
  const DebtDraft({
    required this.name,
    required this.amount,
    required this.type,
    required this.notes,
  });
  final String name;
  final double amount;
  final String type;
  final String notes;
}

class CreateDebtFromDebtsSheet extends StatefulWidget {
  const CreateDebtFromDebtsSheet({
    this.onSave,
    this.initialDraft,
    this.initialType = 'Debo',
    super.key,
  });

  final ValueChanged<DebtDraft>? onSave;
  final DebtDraft? initialDraft;
  final String initialType;

  static Future<void> show({
    required BuildContext context,
    ValueChanged<DebtDraft>? onSave,
    DebtDraft? initialDraft,
    String initialType = 'Debo',
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) => CreateDebtFromDebtsSheet(
        onSave: onSave,
        initialDraft: initialDraft,
        initialType: initialType,
      ),
    );
  }

  @override
  State<CreateDebtFromDebtsSheet> createState() =>
      _CreateDebtFromDebtsSheetState();
}

class _CreateDebtFromDebtsSheetState extends State<CreateDebtFromDebtsSheet> {
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  late String _type = widget.initialType;

  @override
  void initState() {
    super.initState();
    final draft = widget.initialDraft;
    if (draft != null) {
      _nameController.text = draft.name;
      _amountController.text = draft.amount.toString();
      _noteController.text = draft.notes;
      _type = draft.type;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _saveDebt() {
    final amount = double.tryParse(
      _amountController.text.replaceAll(RegExp(r'[^0-9.]'), ''),
    );
    final name = _nameController.text.trim();
    if (amount == null || amount <= 0 || name.isEmpty) return;
    widget.onSave?.call(
      DebtDraft(
        name: name,
        amount: amount,
        type: _type,
        notes: _noteController.text.trim(),
      ),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: widget.initialDraft == null ? 'Nueva deuda' : 'Editar deuda',
      subtitle: 'Registra una deuda o dinero por cobrar.',
      primaryActionLabel: widget.initialDraft == null
          ? 'Guardar deuda'
          : 'Guardar cambios',
      onPrimaryAction: _saveDebt,
      secondaryActionLabel: 'Cancelar',
      onSecondaryAction: () => Navigator.of(context).pop(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Nombre',
            hint: 'Persona o entidad',
            controller: _nameController,
            prefixIcon: Icons.person_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Monto',
            hint: r'$0.00',
            controller: _amountController,
            keyboardType: TextInputType.number,
            prefixIcon: Icons.payments_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          _DebtTypeSelector(
            selectedType: _type,
            onTypeChanged: (type) {
              setState(() {
                _type = type;
              });
            },
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
            hint: 'Ej. préstamo pendiente',
            controller: _noteController,
            prefixIcon: Icons.notes_rounded,
            maxLines: 2,
          ),
        ],
      ),
    );
  }
}

class _DebtTypeSelector extends StatelessWidget {
  const _DebtTypeSelector({
    required this.selectedType,
    required this.onTypeChanged,
  });

  final String selectedType;
  final ValueChanged<String> onTypeChanged;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Tipo', style: textTheme.labelLarge),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: _DebtTypeChip(
                label: 'Debo',
                icon: Icons.arrow_upward_rounded,
                color: AppColors.danger,
                isSelected: selectedType == 'Debo',
                onTap: () => onTypeChanged('Debo'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _DebtTypeChip(
                label: 'Me deben',
                icon: Icons.arrow_downward_rounded,
                color: AppColors.success,
                isSelected: selectedType == 'Me deben',
                onTap: () => onTypeChanged('Me deben'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _DebtTypeChip extends StatelessWidget {
  const _DebtTypeChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Material(
      color: isSelected ? color.withValues(alpha: 0.12) : Colors.transparent,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 48),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
            border: Border.all(
              color: isSelected ? color : AppColors.borderLight,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: AppSpacing.sm),
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.labelLarge?.copyWith(color: color),
                ),
              ),
            ],
          ),
        ),
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
