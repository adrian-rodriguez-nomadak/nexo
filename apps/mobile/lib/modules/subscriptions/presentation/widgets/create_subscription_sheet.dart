import 'package:flutter/material.dart';
import '../../../../core/utils/formatters.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class SubscriptionDraft {
  const SubscriptionDraft({
    required this.name,
    required this.amount,
    required this.billingDay,
    required this.category,
  });
  final String name;
  final double amount;
  final int billingDay;
  final String category;
}

class CreateSubscriptionSheet extends StatefulWidget {
  const CreateSubscriptionSheet({this.onSave, this.initialDraft, super.key});

  final ValueChanged<SubscriptionDraft>? onSave;
  final SubscriptionDraft? initialDraft;

  static Future<void> show({
    required BuildContext context,
    ValueChanged<SubscriptionDraft>? onSave,
    SubscriptionDraft? initialDraft,
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) =>
          CreateSubscriptionSheet(onSave: onSave, initialDraft: initialDraft),
    );
  }

  @override
  State<CreateSubscriptionSheet> createState() =>
      _CreateSubscriptionSheetState();
}

class _CreateSubscriptionSheetState extends State<CreateSubscriptionSheet> {
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  final _billingDayController = TextEditingController();
  final _categoryController = TextEditingController();
  final _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final draft = widget.initialDraft;
    if (draft != null) {
      _nameController.text = draft.name;
      _amountController.text = draft.amount.toString();
      _billingDayController.text = draft.billingDay.toString();
      _categoryController.text = draft.category;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _billingDayController.dispose();
    _categoryController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _saveSubscription() {
    final amount = double.tryParse(
      _amountController.text.replaceAll(RegExp(r'[^0-9.]'), ''),
    );
    final billingDay = int.tryParse(_billingDayController.text);
    final name = _nameController.text.trim();
    if (amount == null || amount <= 0 || name.isEmpty) return;
    widget.onSave?.call(
      SubscriptionDraft(
        name: name,
        amount: amount,
        billingDay: (billingDay == null || billingDay < 1 || billingDay > 31)
            ? 1
            : billingDay,
        category: _categoryController.text.trim(),
      ),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: widget.initialDraft == null
          ? 'Nueva suscripción'
          : 'Editar suscripción',
      subtitle: 'Registra un cobro recurrente y su próximo vencimiento.',
      primaryActionLabel: widget.initialDraft == null
          ? 'Guardar suscripción'
          : 'Guardar cambios',
      onPrimaryAction: _saveSubscription,
      secondaryActionLabel: 'Cancelar',
      onSecondaryAction: () => Navigator.of(context).pop(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Nombre',
            hint: 'Netflix, gym, iCloud...',
            controller: _nameController,
            prefixIcon: Icons.subscriptions_rounded,
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
          AppTextField(
            label: 'Día de cobro',
            hint: 'Día 15',
            controller: _billingDayController,
            keyboardType: TextInputType.number,
            prefixIcon: Icons.event_repeat_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Categoría',
            hint: 'Entretenimiento, salud, servicios...',
            controller: _categoryController,
            prefixIcon: Icons.category_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          const _VisualField(
            label: 'Repetición',
            value: 'Mensual',
            icon: Icons.repeat_rounded,
            color: AppColors.subscription,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Notas',
            hint: 'Detalles de la suscripción',
            controller: _notesController,
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
