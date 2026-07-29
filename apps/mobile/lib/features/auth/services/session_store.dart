import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/nexo_session.dart';

class SessionStore {
  SessionStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _sessionKey = 'nexo.auth.session.v1';
  final FlutterSecureStorage _storage;

  Future<void> save(NexoSession session) {
    return _storage.write(
      key: _sessionKey,
      value: jsonEncode({
        'token': session.token,
        'expiresAt': session.expiresAt.toIso8601String(),
        'user': session.user.toJson(),
      }),
    );
  }

  Future<NexoSession?> read() async {
    try {
      final encoded = await _storage.read(key: _sessionKey);
      if (encoded == null) return null;
      final decoded = jsonDecode(encoded);
      if (decoded is! Map<String, dynamic>) return null;
      final session = NexoSession.fromJson(decoded);
      if (!session.isLocallyValid) {
        await clear();
        return null;
      }
      return session;
    } catch (_) {
      await clear();
      return null;
    }
  }

  Future<void> clear() => _storage.delete(key: _sessionKey);
}
