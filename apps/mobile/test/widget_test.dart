import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:nexo/app/navigation/nexo_shell.dart';
import 'package:nexo/app/theme/nexo_theme.dart';
import 'package:nexo/core/network/nexo_api.dart';
import 'package:nexo/features/auth/domain/nexo_session.dart';
import 'package:nexo/features/auth/presentation/login_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

const testUser = NexoUser(
  id: 'user-1',
  email: 'adrian@example.com',
  displayName: 'Adrián',
);

NexoApi testApi({
  Future<http.Response> Function(http.Request request)? handler,
}) {
  return NexoApi(
    token: 'test-token',
    client: MockClient(
      handler ??
          (request) async {
            if (request.url.path == '/api/captures') {
              return http.Response(jsonEncode({'captures': []}), 200);
            }
            return http.Response('{}', 200);
          },
    ),
  );
}

Widget shellApp(NexoApi api) {
  return MaterialApp(
    theme: NexoTheme.dark(),
    home: NexoShell(api: api, user: testUser, onSignOut: () async {}),
  );
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('shows the authenticated home and its seven modules', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(shellApp(testApi()));
    await tester.pumpAndSettle();

    expect(find.text('Tu día.'), findsOneWidget);
    expect(find.text('Finanzas'), findsOneWidget);
    expect(find.text('Gimnasio'), findsOneWidget);
    expect(find.byKey(const Key('capture-nav')), findsOneWidget);
  });

  testWidgets('saves a manual capture through the backend', (
    WidgetTester tester,
  ) async {
    final api = testApi(
      handler: (request) async {
        if (request.method == 'GET') {
          return http.Response(jsonEncode({'captures': []}), 200);
        }
        return http.Response(
          jsonEncode({
            'capture': {
              'id': 'capture-1',
              'module': 'notes',
              'content': 'Idea para conectar mis hábitos',
              'createdAt': DateTime.now().toIso8601String(),
            },
          }),
          201,
        );
      },
    );
    await tester.pumpWidget(shellApp(api));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('capture-nav')));
    await tester.pumpAndSettle();
    expect(find.text('Captura algo importante'), findsOneWidget);

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

  testWidgets('configures the Observer by module', (WidgetTester tester) async {
    await tester.pumpWidget(shellApp(testApi()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Módulos'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('observer-module-card')));
    await tester.pumpAndSettle();

    expect(find.text('A qué debe prestar atención'), findsOneWidget);
    expect(find.text('0 módulos · 0 submódulos'), findsOneWidget);

    await tester.tap(find.byKey(const Key('observer-permission-finances')));
    await tester.pump();

    expect(find.text('1 módulo · 4 submódulos'), findsOneWidget);
    expect(find.text('Cuentas'), findsOneWidget);
    expect(find.text('Movimientos'), findsOneWidget);
  });

  testWidgets('does not pretend to record without an authorized module', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(shellApp(testApi()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Módulos'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('observer-module-card')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('observer-session-button')));
    await tester.pump();

    expect(
      find.text('Activa al menos un módulo para comenzar.'),
      findsOneWidget,
    );
    expect(find.text('Observador por burbuja'), findsOneWidget);
    expect(find.text('Observando'), findsNothing);
  });

  testWidgets('validates the mobile login form', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: NexoTheme.dark(),
        home: LoginScreen(
          onSubmit: ({required email, required password, displayName}) async {},
        ),
      ),
    );

    expect(find.text('Bienvenido de vuelta'), findsOneWidget);
    await tester.tap(find.byKey(const Key('auth-submit')));
    await tester.pump();
    expect(find.text('Escribe un correo válido.'), findsOneWidget);
    expect(find.text('Usa al menos 8 caracteres.'), findsOneWidget);
  });
}
