import 'package:flutter/material.dart';

import '../../../../core/constants/app_spacing.dart';

class BudgetDraft {
  const BudgetDraft({required this.category, required this.amount});

  final String category;
  final double amount;
}

class CreateBudgetSheet extends StatefulWidget {
  const CreateBudgetSheet({super.key, required this.onSave});

  final Future<void> Function(BudgetDraft draft) onSave;

  static Future<void> show({
    required BuildContext context,
    required Future<void> Function(BudgetDraft draft) onSave,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => CreateBudgetSheet(onSave: onSave),
  );

  @override
  State<CreateBudgetSheet> createState() => _CreateBudgetSheetState();
}

class _CreateBudgetSheetState extends State<CreateBudgetSheet> {
  final _formKey = GlobalKey<FormState>();
  final _category = TextEditingController();
  final _amount = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _category.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    await widget.onSave(
      BudgetDraft(
        category: _category.text.trim(),
        amount: double.parse(_amount.text.replaceAll(',', '')),
      ),
    );
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenPadding,
        0,
        AppSpacing.screenPadding,
        MediaQuery.viewInsetsOf(context).bottom + AppSpacing.xl,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Nuevo presupuesto',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Usa el mismo nombre de categoría que registras en tus gastos.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.lg),
            TextFormField(
              controller: _category,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Categoría',
                hintText: 'Ej. Comida',
              ),
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Escribe una categoría'
                  : null,
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _amount,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Límite del periodo',
                prefixText: r'$ ',
              ),
              validator: (value) {
                final amount = double.tryParse(
                  (value ?? '').replaceAll(',', ''),
                );
                if (amount == null || amount <= 0) {
                  return 'Ingresa un límite mayor a cero';
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.xl),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Guardando…' : 'Guardar presupuesto'),
            ),
          ],
        ),
      ),
    );
  }
}
