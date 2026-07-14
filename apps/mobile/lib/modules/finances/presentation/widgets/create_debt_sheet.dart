import 'package:flutter/material.dart';
import '../../../../core/utils/formatters.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class CreateDebtSheet extends StatefulWidget {
  const CreateDebtSheet({this.onSaved, this.onSave, super.key});

  final VoidCallback? onSaved;
  final VoidCallback? onSave;

  static Future<void> show({
    required BuildContext context,
    VoidCallback? onSaved,
    VoidCallback? onSave,
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) => CreateDebtSheet(onSaved: onSaved, onSave: onSave),
    );
  }

  @override
  State<CreateDebtSheet> createState() => _CreateDebtSheetState();
}

class _CreateDebtSheetState extends State<CreateDebtSheet> {
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  String _type = 'Debo';

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _saveDebt() {
    Navigator.of(context).pop();
    (widget.onSave ?? widget.onSaved)?.call();
  }

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: 'Nueva deuda',
      subtitle: 'Registra una deuda o dinero por cobrar.',
      primaryActionLabel: 'Guardar deuda',
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
            hint: moneyInputHint,
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
          AppTextField(
            label: 'Nota',
            hint: 'Ej. préstamo pendiente',
            controller: _noteController,
            prefixIcon: Icons.notes_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          const _DatePreviewField(),
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
