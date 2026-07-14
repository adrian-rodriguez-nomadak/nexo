import 'package:flutter/material.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../../../core/utils/formatters.dart';
import '../../domain/models/finance_account.dart';

class TransferDraft {
  const TransferDraft({
    required this.fromAccountId,
    required this.toAccountId,
    required this.amount,
    required this.notes,
  });

  final String fromAccountId;
  final String toAccountId;
  final double amount;
  final String notes;
}

class CreateTransferSheet extends StatefulWidget {
  const CreateTransferSheet({
    super.key,
    required this.accounts,
    required this.onSave,
  });

  final List<FinanceAccount> accounts;
  final Future<void> Function(TransferDraft) onSave;

  static Future<void> show({
    required BuildContext context,
    required List<FinanceAccount> accounts,
    required Future<void> Function(TransferDraft) onSave,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => CreateTransferSheet(accounts: accounts, onSave: onSave),
  );

  @override
  State<CreateTransferSheet> createState() => _CreateTransferSheetState();
}

class _CreateTransferSheetState extends State<CreateTransferSheet> {
  final _amount = TextEditingController();
  final _notes = TextEditingController();
  late String _from = widget.accounts.first.id;
  late String _to = widget.accounts[1].id;

  @override
  void dispose() {
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final amount = double.tryParse(_amount.text.replaceAll(',', ''));
    if (amount == null || amount <= 0 || _from == _to) return;
    await widget.onSave(
      TransferDraft(
        fromAccountId: _from,
        toAccountId: _to,
        amount: amount,
        notes: _notes.text.trim(),
      ),
    );
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      AppSpacing.screenPadding,
      0,
      AppSpacing.screenPadding,
      MediaQuery.viewInsetsOf(context).bottom + AppSpacing.xl,
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Transferir dinero',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: AppSpacing.lg),
        DropdownButtonFormField<String>(
          initialValue: _from,
          decoration: const InputDecoration(labelText: 'Desde'),
          items: _items(),
          onChanged: (value) => setState(() => _from = value ?? _from),
        ),
        const SizedBox(height: AppSpacing.md),
        DropdownButtonFormField<String>(
          initialValue: _to,
          decoration: const InputDecoration(labelText: 'Hacia'),
          items: _items(),
          onChanged: (value) => setState(() => _to = value ?? _to),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _amount,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'Monto',
            prefixText: '$currencySymbol ',
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _notes,
          decoration: const InputDecoration(labelText: 'Nota opcional'),
        ),
        const SizedBox(height: AppSpacing.xl),
        FilledButton(onPressed: _save, child: const Text('Transferir')),
      ],
    ),
  );

  List<DropdownMenuItem<String>> _items() => widget.accounts
      .map(
        (account) => DropdownMenuItem(
          value: account.id,
          child: Text('${account.name} · ${money(account.currentBalance)}'),
        ),
      )
      .toList();
}
