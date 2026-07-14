String money(num value, {bool signed = false}) {
  final sign = signed && value > 0 ? '+' : '';
  final absolute = value.abs().toStringAsFixed(0);
  final buffer = StringBuffer();
  for (var i = 0; i < absolute.length; i++) {
    final left = absolute.length - i;
    buffer.write(absolute[i]);
    if (left > 1 && left % 3 == 1) buffer.write(',');
  }
  return '$sign\$${buffer.toString()}';
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
