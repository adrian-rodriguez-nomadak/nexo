import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:nexo_mobile/app/app.dart';

void main() {
  testWidgets('shows the personal memory navigation', (tester) async {
    await tester.pumpWidget(const NexoApp());

    expect(find.text('Entrada'), findsOneWidget);
    expect(find.text('Tiempo'), findsOneWidget);
    expect(find.text('Mapa'), findsOneWidget);
    expect(find.text('Resumen'), findsOneWidget);
    expect(find.text('Ajustes'), findsOneWidget);
  });

  testWidgets('free mode asks no more than three follow-up questions', (
    tester,
  ) async {
    await tester.pumpWidget(const NexoApp());
    await tester.enterText(
      find.byKey(const Key('memory_input')),
      'Tenía sueño, pedí un Uber, hablé con Ana y fui al gimnasio a entrenar.',
    );
    await tester.ensureVisible(find.byKey(const Key('analyze_button')));
    await tester.tap(find.byKey(const Key('analyze_button')));
    await tester.pump();

    expect(find.text('3 preguntas'), findsOneWidget);
  });
}
