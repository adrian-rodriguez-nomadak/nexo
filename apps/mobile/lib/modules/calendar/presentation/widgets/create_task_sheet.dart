import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class TaskDraft {
  const TaskDraft({
    required this.title,
    required this.description,
    required this.priority,
  });
  final String title;
  final String description;
  final String priority;
}

class CreateTaskSheet extends StatefulWidget {
  const CreateTaskSheet({this.onSave, this.initialDraft, super.key});

  final ValueChanged<TaskDraft>? onSave;
  final TaskDraft? initialDraft;

  static Future<void> show({
    required BuildContext context,
    ValueChanged<TaskDraft>? onSave,
    TaskDraft? initialDraft,
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) =>
          CreateTaskSheet(onSave: onSave, initialDraft: initialDraft),
    );
  }

  @override
  State<CreateTaskSheet> createState() => _CreateTaskSheetState();
}

class _CreateTaskSheetState extends State<CreateTaskSheet> {
  final _titleController = TextEditingController();
  final _notesController = TextEditingController();
  String _priority = 'Media';

  @override
  void initState() {
    super.initState();
    final draft = widget.initialDraft;
    if (draft != null) {
      _titleController.text = draft.title;
      _notesController.text = draft.description;
      _priority =
          '${draft.priority[0].toUpperCase()}${draft.priority.substring(1)}';
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _saveTask() {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;
    widget.onSave?.call(
      TaskDraft(
        title: title,
        description: _notesController.text.trim(),
        priority: _priority.toLowerCase(),
      ),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: widget.initialDraft == null ? 'Nueva tarea' : 'Editar tarea',
      subtitle: 'Agrega un pendiente para tu día.',
      primaryActionLabel: widget.initialDraft == null
          ? 'Guardar tarea'
          : 'Guardar cambios',
      onPrimaryAction: _saveTask,
      secondaryActionLabel: 'Cancelar',
      onSecondaryAction: () => Navigator.of(context).pop(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Título',
            hint: 'Ej. enviar comprobante',
            controller: _titleController,
            prefixIcon: Icons.add_task_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          const _VisualField(
            label: 'Fecha',
            value: 'Hoy',
            icon: Icons.today_rounded,
            color: AppColors.primaryDark,
          ),
          const SizedBox(height: AppSpacing.lg),
          _PrioritySelector(
            selectedPriority: _priority,
            onPriorityChanged: (priority) {
              setState(() {
                _priority = priority;
              });
            },
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Notas',
            hint: 'Detalles de la tarea',
            controller: _notesController,
            prefixIcon: Icons.notes_rounded,
            maxLines: 2,
          ),
        ],
      ),
    );
  }
}

class _PrioritySelector extends StatelessWidget {
  const _PrioritySelector({
    required this.selectedPriority,
    required this.onPriorityChanged,
  });

  final String selectedPriority;
  final ValueChanged<String> onPriorityChanged;

  static const _priorities = [
    ('Baja', AppColors.success),
    ('Media', AppColors.warning),
    ('Alta', AppColors.danger),
  ];

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Prioridad', style: textTheme.labelLarge),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: _priorities.map((priority) {
            final label = priority.$1;
            final color = priority.$2;
            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(
                  right: priority == _priorities.last ? 0 : AppSpacing.sm,
                ),
                child: _PriorityChip(
                  label: label,
                  color: color,
                  isSelected: selectedPriority == label,
                  onTap: () => onPriorityChanged(label),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _PriorityChip extends StatelessWidget {
  const _PriorityChip({
    required this.label,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected ? color.withValues(alpha: 0.12) : Colors.transparent,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          constraints: const BoxConstraints(minHeight: 44),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
            border: Border.all(
              color: isSelected ? color : AppColors.borderLight,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: isSelected ? color : AppColors.textPrimary,
            ),
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
