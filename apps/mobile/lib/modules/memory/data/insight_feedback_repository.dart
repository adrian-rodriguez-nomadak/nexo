import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class InsightFeedbackRepository {
  const InsightFeedbackRepository({
    this.storage = const FlutterSecureStorage(),
  });

  static const _key = 'nexo_insight_feedback';
  final FlutterSecureStorage storage;

  Future<Map<String, bool>> load() async {
    final raw = await storage.read(key: _key);
    if (raw == null || raw.isEmpty) return {};
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return decoded.map((key, value) => MapEntry(key, value == true));
  }

  Future<void> save(Map<String, bool> feedback) {
    return storage.write(key: _key, value: jsonEncode(feedback));
  }
}
