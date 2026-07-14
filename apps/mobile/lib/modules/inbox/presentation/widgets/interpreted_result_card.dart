import 'package:flutter/material.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_card.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';
import '../models/inbox_interpretation.dart';

class InterpretedResultCard extends StatelessWidget {
  const InterpretedResultCard({
    required this.result,
    required this.onSave,
    required this.onEdit,
    required this.onCancel,
    super.key,
  });

  final InboxInterpretation result;
  final VoidCallback onSave;
  final VoidCallback onEdit;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ModuleBadge(icon: result.icon, color: result.color),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Detecté ${result.detectedLabel}',
                      style: textTheme.titleLarge,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(result.preview, style: textTheme.bodyMedium),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          _ResultField(label: 'Título', value: result.title),
          const SizedBox(height: AppSpacing.sm),
          _ResultField(label: result.secondaryLabel, value: result.secondary),
          const SizedBox(height: AppSpacing.sm),
          _ResultField(label: 'Categoría', value: result.category),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: onSave,
                  child: const Text('Continuar'),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: OutlinedButton(
                  onPressed: onEdit,
                  child: const Text('Editar'),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              IconButton.outlined(
                onPressed: onCancel,
                icon: const Icon(Icons.close_rounded),
                tooltip: 'Cancelar',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ResultField extends StatelessWidget {
  const _ResultField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 78, child: Text(label, style: textTheme.bodySmall)),
        Expanded(child: Text(value, style: textTheme.labelLarge)),
      ],
    );
  }
}
