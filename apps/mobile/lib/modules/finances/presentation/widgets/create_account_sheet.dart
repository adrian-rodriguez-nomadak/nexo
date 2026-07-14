import 'package:flutter/material.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../../../core/utils/formatters.dart';

class AccountDraft {
  const AccountDraft({
    required this.name,
    required this.type,
    required this.initialBalance,
  });

  final String name;
  final String type;
  final double initialBalance;
}

class CreateAccountSheet extends StatefulWidget {
  const CreateAccountSheet({super.key, required this.onSave});

  final Future<void> Function(AccountDraft draft) onSave;

  static Future<void> show({
    required BuildContext context,
    required Future<void> Function(AccountDraft draft) onSave,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => CreateAccountSheet(onSave: onSave),
  );

  @override
  State<CreateAccountSheet> createState() => _CreateAccountSheetState();
}

class _CreateAccountSheetState extends State<CreateAccountSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _balance = TextEditingController();
  String _type = 'Efectivo';
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _balance.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    await widget.onSave(
      AccountDraft(
        name: _name.text.trim(),
        type: _type,
        initialBalance: double.parse(_balance.text.replaceAll(',', '')),
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
              'Agregar cuenta',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'El saldo inicial da contexto a tus ingresos y gastos.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.lg),
            TextFormField(
              controller: _name,
              decoration: InputDecoration(
                labelText: 'Nombre',
                hintText: 'Ej. Cuenta principal',
              ),
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Escribe un nombre'
                  : null,
            ),
            const SizedBox(height: AppSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Tipo de cuenta'),
              items: const ['Efectivo', 'Banco', 'Tarjeta', 'Ahorro']
                  .map(
                    (type) => DropdownMenuItem(value: type, child: Text(type)),
                  )
                  .toList(),
              onChanged: (value) => setState(() => _type = value ?? _type),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _balance,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: InputDecoration(
                labelText: 'Saldo inicial',
                prefixText: '$currencySymbol ',
                hintText: '0',
              ),
              validator: (value) {
                final amount = double.tryParse(
                  (value ?? '').replaceAll(',', ''),
                );
                if (amount == null || amount < 0) {
                  return 'Ingresa un monto válido';
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.xl),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Guardando…' : 'Guardar cuenta'),
            ),
          ],
        ),
      ),
    );
  }
}
