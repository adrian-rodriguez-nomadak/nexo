String localId(String prefix) {
  return '$prefix-${DateTime.now().microsecondsSinceEpoch}';
}
