import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo/app/nexo_app.dart';

void main() {
  testWidgets('shows the Nexo home and its seven modules', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const NexoApp());

    expect(find.text('Tu día.'), findsOneWidget);
    expect(find.text('Finanzas'), findsOneWidget);
    expect(find.text('Gimnasio'), findsOneWidget);
    expect(find.byKey(const Key('capture-fab')), findsOneWidget);
  });

  testWidgets('creates a session capture from the quick capture sheet', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const NexoApp());

    await tester.tap(find.byKey(const Key('capture-fab')));
    await tester.pumpAndSettle();

    expect(find.text('Cuéntale algo a Nexo'), findsOneWidget);

    await tester.enterText(
      find.byKey(const Key('capture-input')),
      'Idea para conectar mis hábitos',
    );
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();
    await tester.ensureVisible(find.byKey(const Key('save-capture')));
    await tester.tap(find.byKey(const Key('save-capture')));
    await tester.pumpAndSettle();

    expect(find.text('Última captura'), findsOneWidget);
    expect(find.text('Idea para conectar mis hábitos'), findsOneWidget);
  });
}
