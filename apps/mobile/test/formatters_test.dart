import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/core/utils/formatters.dart';

void main() {
  setUp(() => configureMoneyCurrency('MXN'));

  group('money', () {
    test('preserves the negative sign', () {
      expect(money(-600), '-\$600');
      expect(money(-1250), '-\$1,250');
    });

    test('only adds a positive sign when requested', () {
      expect(money(600), '\$600');
      expect(money(600, signed: true), '+\$600');
      expect(money(0, signed: true), '\$0');
    });

    test('uses the configured currency', () {
      configureMoneyCurrency('USD');
      expect(money(600), r'US$600');
      configureMoneyCurrency('EUR');
      expect(money(-600), '-€600');
    });
  });
}
