import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/presentation/widgets/app_bottom_sheet.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/module_badge.dart';
import '../../../../shared/presentation/widgets/twelve_hour_time_field.dart';

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
  final _placeController = TextEditingController();
  final _notesController = TextEditingController();
  late TimeOfDay _startTime;
  late TimeOfDay _endTime;

  @override
  void initState() {
    super.initState();
    final draft = widget.initialDraft;
    final now = DateTime.now();
    _startTime = TimeOfDay.fromDateTime(draft?.startAt ?? now);
    _endTime = TimeOfDay.fromDateTime(
      draft?.endAt ?? (draft?.startAt ?? now).add(const Duration(hours: 1)),
    );
    if (draft != null) {
      _titleController.text = draft.title;
      _placeController.text = draft.location;
      _notesController.text = draft.description;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
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
    final startAt = _timeForDate(_startTime, startDate);
    var endAt = _timeForDate(_endTime, endDate);
    if (!endAt.isAfter(startAt)) {
      endAt = endAt.add(const Duration(days: 1));
    }
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

  DateTime _timeForDate(TimeOfDay time, DateTime date) =>
      DateTime(date.year, date.month, date.day, time.hour, time.minute);

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
          TwelveHourTimeField(
            label: 'Hora inicio',
            value: _startTime,
            onChanged: (time) => setState(() => _startTime = time),
          ),
          const SizedBox(height: AppSpacing.lg),
          TwelveHourTimeField(
            label: 'Hora fin',
            value: _endTime,
            onChanged: (time) => setState(() => _endTime = time),
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
