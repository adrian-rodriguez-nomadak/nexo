import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';

class TwelveHourTimeField extends StatelessWidget {
  const TwelveHourTimeField({
    required this.label,
    required this.value,
    required this.onChanged,
    super.key,
  });

  final String label;
  final TimeOfDay value;
  final ValueChanged<TimeOfDay> onChanged;

  int get _hour12 {
    final hour = value.hour % 12;
    return hour == 0 ? 12 : hour;
  }

  bool get _isPm => value.hour >= 12;

  void _emit({int? hour, int? minute, bool? isPm}) {
    final selectedHour = hour ?? _hour12;
    final selectedPeriod = isPm ?? _isPm;
    final hour24 = selectedHour == 12
        ? (selectedPeriod ? 12 : 0)
        : selectedHour + (selectedPeriod ? 12 : 0);
    onChanged(TimeOfDay(hour: hour24, minute: minute ?? value.minute));
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final decoration = InputDecoration(
      filled: true,
      fillColor: Theme.of(context).inputDecorationTheme.fillColor,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.sm,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
        borderSide: const BorderSide(color: AppColors.borderLight),
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: textTheme.labelLarge),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            const Icon(Icons.schedule_rounded, color: AppColors.textMuted),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: DropdownButtonFormField<int>(
                key: ValueKey('hour-$_hour12'),
                initialValue: _hour12,
                decoration: decoration,
                isExpanded: true,
                items: [
                  for (var hour = 1; hour <= 12; hour++)
                    DropdownMenuItem(value: hour, child: Text('$hour')),
                ],
                onChanged: (hour) {
                  if (hour != null) _emit(hour: hour);
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
              child: Text(':', style: textTheme.titleLarge),
            ),
            Expanded(
              child: DropdownButtonFormField<int>(
                key: ValueKey('minute-${value.minute}'),
                initialValue: value.minute,
                decoration: decoration,
                isExpanded: true,
                items: [
                  for (var minute = 0; minute < 60; minute++)
                    DropdownMenuItem(
                      value: minute,
                      child: Text(minute.toString().padLeft(2, '0')),
                    ),
                ],
                onChanged: (minute) {
                  if (minute != null) _emit(minute: minute);
                },
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            SizedBox(
              width: 88,
              child: SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: false, label: Text('AM')),
                  ButtonSegment(value: true, label: Text('PM')),
                ],
                selected: {_isPm},
                showSelectedIcon: false,
                onSelectionChanged: (selection) =>
                    _emit(isPm: selection.single),
                style: const ButtonStyle(
                  visualDensity: VisualDensity.compact,
                  padding: WidgetStatePropertyAll(EdgeInsets.zero),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
