import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/modules/dashboard/presentation/dashboard_view_data.dart';

void main() {
  test('empty dashboard never falls back to demo records', () {
    final data = buildDashboardViewData(
      userName: 'María',
      todayLabel: 'martes, 14 de julio',
      summary: null,
      payments: const [],
      events: const [],
      tasks: const [],
    );

    expect(data.user.name, 'María');
    expect(data.summary.availableAmount, r'$0');
    expect(data.tasks, isEmpty);
    expect(data.upcomingPayments, isEmpty);
    expect(data.nextEvent.title, 'Sin eventos próximos');
  });
}
