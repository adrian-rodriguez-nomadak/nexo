import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';

class EventDraft {
  const EventDraft({
    required this.title,
    required this.location,
    required this.description,
    required this.startAt,
    required this.endAt,
  });
  final String title;
  final String location;
  final String description;
  final DateTime startAt;
  final DateTime? endAt;
}

class CreateEventSheet extends StatefulWidget {
  const CreateEventSheet({this.onSave, this.initialDraft, super.key});

  final ValueChanged<EventDraft>? onSave;
  final EventDraft? initialDraft;

  static Future<void> show({
    required BuildContext context,
    ValueChanged<EventDraft>? onSave,
    EventDraft? initialDraft,
  }) {
    return AppBottomSheet.show<void>(
      context: context,
      builder: (context) =>
          CreateEventSheet(onSave: onSave, initialDraft: initialDraft),
    );
  }

  @override
  State<CreateEventSheet> createState() => _CreateEventSheetState();
}

class _CreateEventSheetState extends State<CreateEventSheet> {
  final _titleController = TextEditingController();
  final _startController = TextEditingController();
  final _endController = TextEditingController();
  final _placeController = TextEditingController();
  final _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final draft = widget.initialDraft;
    if (draft != null) {
      _titleController.text = draft.title;
      _startController.text =
          '${draft.startAt.hour.toString().padLeft(2, '0')}:${draft.startAt.minute.toString().padLeft(2, '0')}';
      if (draft.endAt != null) {
        _endController.text =
            '${draft.endAt!.hour.toString().padLeft(2, '0')}:${draft.endAt!.minute.toString().padLeft(2, '0')}';
      }
      _placeController.text = draft.location;
      _notesController.text = draft.description;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _startController.dispose();
    _endController.dispose();
    _placeController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _saveEvent() {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;
    final now = DateTime.now();
    final initial = widget.initialDraft;
    final startDate = initial?.startAt ?? now;
    final endDate = initial?.endAt ?? startDate;
    final startAt =
        _timeForToday(_startController.text, startDate) ?? startDate;
    final endAt = _timeForToday(_endController.text, endDate);
    widget.onSave?.call(
      EventDraft(
        title: title,
        location: _placeController.text.trim(),
        description: _notesController.text.trim(),
        startAt: startAt,
        endAt: endAt,
      ),
    );
    Navigator.of(context).pop();
  }

  DateTime? _timeForToday(String raw, DateTime date) {
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
      title: widget.initialDraft == null ? 'Nuevo evento' : 'Editar evento',
      subtitle: 'Agenda una actividad en tu calendario.',
      primaryActionLabel: widget.initialDraft == null
          ? 'Guardar evento'
          : 'Guardar cambios',
      onPrimaryAction: _saveEvent,
      secondaryActionLabel: 'Cancelar',
      onSecondaryAction: () => Navigator.of(context).pop(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Título',
            hint: 'Ej. reunión semanal',
            controller: _titleController,
            prefixIcon: Icons.event_note_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          const _VisualField(
            label: 'Fecha',
            value: 'Hoy',
            icon: Icons.today_rounded,
            color: AppColors.primaryDark,
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(
                child: AppTextField(
                  label: 'Hora inicio',
                  hint: '9:00 AM',
                  controller: _startController,
                  keyboardType: TextInputType.datetime,
                  prefixIcon: Icons.schedule_rounded,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: AppTextField(
                  label: 'Hora fin',
                  hint: '10:00 AM',
                  controller: _endController,
                  keyboardType: TextInputType.datetime,
                  prefixIcon: Icons.schedule_rounded,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Lugar opcional',
            hint: 'Oficina, casa, llamada...',
            controller: _placeController,
            prefixIcon: Icons.place_rounded,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            label: 'Notas',
            hint: 'Detalles del evento',
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
