import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:nexo_mobile/app/app.dart';
import 'package:nexo_mobile/core/config/data_source_mode.dart';

Widget testApp() {
  return ProviderScope(
    overrides: [dataSourceModeProvider.overrideWithValue(DataSourceMode.mock)],
    child: const NexoApp(),
  );
}

void main() {
  testWidgets('shows bottom navigation sections', (WidgetTester tester) async {
    await tester.pumpWidget(testApp());
    await tester.pumpAndSettle();

    expect(find.text('Inicio'), findsWidgets);
    expect(find.text('Calendario'), findsOneWidget);
    expect(find.text('Inbox'), findsWidgets);
    expect(find.text('Finanzas'), findsOneWidget);
    expect(find.text('Ajustes'), findsOneWidget);
  });

  testWidgets('navigates between shell sections', (WidgetTester tester) async {
    await tester.pumpWidget(testApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('Finanzas').first);
    await tester.pumpAndSettle();

    expect(
      find.text('Finanzas'),
      findsWidgets,
    );
  });
}
