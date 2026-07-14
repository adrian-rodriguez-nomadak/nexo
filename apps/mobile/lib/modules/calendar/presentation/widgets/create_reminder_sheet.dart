import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class ReminderDraft {
  const ReminderDraft({
    required this.title,
    required this.description,
    required this.remindAt,
  });
  final String title;
  final String description;
  final DateTime remindAt;
}

class CreateReminderSheet extends StatefulWidget {
  const CreateReminderSheet({this.onSave, this.initialDraft, super.key});

  final ValueChanged<ReminderDraft>? onSave;
  final ReminderDraft? initialDraft;

  static Future<void> show({
    required BuildContext context,
    ValueChanged<ReminderDraft>? onSave,
    ReminderDraft? initialDraft,
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) =>
          CreateReminderSheet(onSave: onSave, initialDraft: initialDraft),
    );
  }

  @override
  State<CreateReminderSheet> createState() => _CreateReminderSheetState();
}

class _CreateReminderSheetState extends State<CreateReminderSheet> {
  final _titleController = TextEditingController();
  final _timeController = TextEditingController();
  final _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final draft = widget.initialDraft;
    if (draft != null) {
      _titleController.text = draft.title;
      _timeController.text =
          '${draft.remindAt.hour.toString().padLeft(2, '0')}:${draft.remindAt.minute.toString().padLeft(2, '0')}';
      _notesController.text = draft.description;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _timeController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _saveReminder() {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;
    widget.onSave?.call(
      ReminderDraft(
        title: title,
        description: _notesController.text.trim(),
        remindAt:
            _timeForDate(
              _timeController.text,
              widget.initialDraft?.remindAt ?? DateTime.now(),
            ) ??
            widget.initialDraft?.remindAt ??
            DateTime.now(),
      ),
    );
    Navigator.of(context).pop();
  }

  DateTime? _timeForDate(String raw, DateTime date) {
    final match = RegExp(
      r'^(\d{1,2}):(\d{2})\s*([aApP][mM])?$',
    ).firstMatch(raw.trim());
    if (match == null) return null;
    var hour = int.parse(match.group(1)!);
    final minute = int.parse(match.group(2)!);
    final period = match.group(3)?.toLowerCase();
    if (minute > 59 || hour > 23 || hour == 0 && period != null) return null;
    if (period == 'pm' && hour < 12) hour += 12;
    if (period == 'am' && hour == 12) hour = 0;
    return DateTime(date.year, date.month, date.day, hour, minute);
  }

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: widget.initialDraft == null
          ? 'Nuevo recordatorio'
          : 'Editar recordatorio',
      subtitle: 'Crea un aviso rápido para el prototipo.',
      primaryActionLabel: widget.initialDraft == null
          ? 'Guardar recordatorio'
          : 'Guardar cambios',
      onPrimaryAction: _saveReminder,
      secondaryActionLabel: 'Cancelar',
      onSecondaryAction: () => Navigator.of(context).pop(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Título',
            hint: 'Ej. pagar el gym',
            controller: _titleController,
            prefixIcon: Icons.notifications_active_rounded,
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
            label: 'Hora',
            hint: '6:00 PM',
            controller: _timeController,
            keyboardType: TextInputType.datetime,
            prefixIcon: Icons.schedule_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          const _VisualField(
            label: 'Repetición',
            value: 'No repetir',
            icon: Icons.repeat_rounded,
            color: AppColors.calendar,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Notas',
            hint: 'Detalles del recordatorio',
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
