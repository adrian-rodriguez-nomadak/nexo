import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/shared/presentation/widgets/twelve_hour_time_field.dart';

void main() {
  testWidgets('converts 12 AM to 12 PM when selecting PM', (tester) async {
    TimeOfDay? selected;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 400,
            child: TwelveHourTimeField(
              label: 'Hora',
              value: const TimeOfDay(hour: 0, minute: 30),
              onChanged: (value) => selected = value,
            ),
          ),
        ),
      ),
    );

    expect(find.text('12'), findsOneWidget);
    expect(find.text('30'), findsOneWidget);
    await tester.tap(find.text('PM'));
    await tester.pumpAndSettle();

    expect(selected, const TimeOfDay(hour: 12, minute: 30));
    expect(tester.takeException(), isNull);
  });

  testWidgets('converts an afternoon hour back to AM', (tester) async {
    TimeOfDay? selected;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 400,
            child: TwelveHourTimeField(
              label: 'Hora',
              value: const TimeOfDay(hour: 18, minute: 5),
              onChanged: (value) => selected = value,
            ),
          ),
        ),
      ),
    );

    expect(find.text('6'), findsOneWidget);
    expect(find.text('05'), findsOneWidget);
    await tester.tap(find.text('AM'));
    await tester.pumpAndSettle();

    expect(selected, const TimeOfDay(hour: 6, minute: 5));
    expect(tester.takeException(), isNull);
  });
}
