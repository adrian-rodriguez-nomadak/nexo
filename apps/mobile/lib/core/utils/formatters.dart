String _currencyCode = 'MXN';

void configureMoneyCurrency(String currencyCode) {
  _currencyCode = currencyCode;
}

String get currencySymbol => switch (_currencyCode) {
  'USD' => r'US$',
  'EUR' => '€',
  _ => r'$',
};

String get moneyInputHint => '${currencySymbol}0.00';

String money(num value, {bool signed = false}) {
  final sign = value < 0 ? '-' : (signed && value > 0 ? '+' : '');
  final absolute = value.abs().toStringAsFixed(0);
  final buffer = StringBuffer();
  for (var i = 0; i < absolute.length; i++) {
    final left = absolute.length - i;
    buffer.write(absolute[i]);
    if (left > 1 && left % 3 == 1) buffer.write(',');
  }
  return '$sign$currencySymbol${buffer.toString()}';
}

String shortDate(DateTime date) {
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  return '${date.day} ${months[date.month - 1]}';
}

String shortTime(DateTime date) {
  final hour = date.hour == 0
      ? 12
      : (date.hour > 12 ? date.hour - 12 : date.hour);
  final minute = date.minute.toString().padLeft(2, '0');
  final suffix = date.hour >= 12 ? 'PM' : 'AM';
  return '$hour:$minute $suffix';
}
