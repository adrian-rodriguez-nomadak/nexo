import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';
import '../../../../shared/presentation/widgets/twelve_hour_time_field.dart';

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
  final _notesController = TextEditingController();
  late TimeOfDay _reminderTime;

  @override
  void initState() {
    super.initState();
    final draft = widget.initialDraft;
    _reminderTime = TimeOfDay.fromDateTime(
      draft?.remindAt ?? DateTime.now().add(const Duration(hours: 1)),
    );
    if (draft != null) {
      _titleController.text = draft.title;
      _notesController.text = draft.description;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
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
        remindAt: _timeForDate(
          _reminderTime,
          widget.initialDraft?.remindAt ?? DateTime.now(),
        ),
      ),
    );
    Navigator.of(context).pop();
  }

  DateTime _timeForDate(TimeOfDay time, DateTime date) =>
      DateTime(date.year, date.month, date.day, time.hour, time.minute);

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      title: widget.initialDraft == null
          ? 'Nuevo recordatorio'
          : 'Editar recordatorio',
      subtitle: 'Crea un aviso para no olvidar lo importante.',
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
          TwelveHourTimeField(
            label: 'Hora',
            value: _reminderTime,
            onChanged: (time) => setState(() => _reminderTime = time),
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
