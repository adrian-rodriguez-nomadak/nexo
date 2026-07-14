double readDouble(Object? value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

int readInt(Object? value) {
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

DateTime readDateTime(Object? value) {
  return DateTime.tryParse(value?.toString() ?? '') ?? DateTime.now();
}

DateTime? readNullableDateTime(Object? value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}

Map<String, dynamic> readMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return value.map((key, val) => MapEntry('$key', val));
  return <String, dynamic>{};
}
