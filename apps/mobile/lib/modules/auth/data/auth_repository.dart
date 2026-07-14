import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/http/api_client.dart';
import '../domain/auth_session.dart';

class AuthRepository {
  const AuthRepository({
    this.client = const ApiClient(),
    this.storage = const FlutterSecureStorage(),
  });

  static const _refreshTokenKey = 'nexo_refresh_token';
  final ApiClient client;
  final FlutterSecureStorage storage;

  Future<AuthSession> login({required String email, required String password}) {
    return _authenticate('/auth/login', {'email': email, 'password': password});
  }

  Future<AuthSession> register({
    required String name,
    required String email,
    required String password,
  }) {
    return _authenticate('/auth/register', {
      'name': name,
      'email': email,
      'password': password,
    });
  }

  Future<AuthSession?> restore() async {
    final refreshToken = await storage.read(key: _refreshTokenKey);
    if (refreshToken == null) return null;
    try {
      final data = await client.post('/auth/refresh', {
        'refresh_token': refreshToken,
      });
      final map = data as Map<String, dynamic>;
      final nextRefreshToken = map['refresh_token'] as String;
      await storage.write(key: _refreshTokenKey, value: nextRefreshToken);
      return AuthSession(
        userId: '',
        name: '',
        email: '',
        accessToken: map['access_token'] as String,
      );
    } catch (_) {
      await storage.delete(key: _refreshTokenKey);
      return null;
    }
  }

  Future<void> logout() async {
    final refreshToken = await storage.read(key: _refreshTokenKey);
    if (refreshToken != null) {
      try {
        await client.post('/auth/logout', {'refresh_token': refreshToken});
      } catch (_) {
        // Local logout must still succeed while offline.
      }
    }
    await storage.delete(key: _refreshTokenKey);
  }

  Future<AuthSession> _authenticate(
    String path,
    Map<String, dynamic> body,
  ) async {
    final data = await client.post(path, body) as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;
    final tokens = data['tokens'] as Map<String, dynamic>;
    await storage.write(
      key: _refreshTokenKey,
      value: tokens['refresh_token'] as String,
    );
    return AuthSession(
      userId: user['id'] as String,
      name: user['name'] as String,
      email: user['email'] as String,
      accessToken: tokens['access_token'] as String,
    );
  }
}
