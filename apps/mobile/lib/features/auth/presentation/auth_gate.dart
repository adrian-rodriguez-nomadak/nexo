import 'package:flutter/material.dart';

import '../../../app/navigation/nexo_shell.dart';
import '../../../core/network/nexo_api.dart';
import '../domain/nexo_session.dart';
import '../services/session_store.dart';
import 'login_screen.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final _api = NexoApi();
  final _store = SessionStore();
  NexoSession? _session;
  bool _isRestoring = true;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final saved = await _store.read();
    if (saved == null) {
      if (mounted) setState(() => _isRestoring = false);
      return;
    }

    try {
      final data = await _api.authenticated(saved.token).get('/api/auth/me');
      final user = NexoUser.fromJson(data['user'] as Map<String, dynamic>);
      final restored = NexoSession(
        token: saved.token,
        expiresAt: saved.expiresAt,
        user: user,
      );
      await _store.save(restored);
      if (mounted) setState(() => _session = restored);
    } on NexoApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        await _store.clear();
      } else if (mounted) {
        setState(() => _session = saved);
      }
    } finally {
      if (mounted) setState(() => _isRestoring = false);
    }
  }

  Future<void> _authenticate({
    required String email,
    required String password,
    String? displayName,
  }) async {
    final registering = displayName != null;
    final data = await _api.post(
      '/api/auth/${registering ? 'register' : 'login'}',
      body: {
        'email': email,
        'password': password,
        if (registering) 'displayName': displayName,
      },
    );
    final session = NexoSession.fromJson(data);
    await _store.save(session);
    if (mounted) setState(() => _session = session);
  }

  Future<void> _signOut() async {
    final session = _session;
    if (session != null) {
      try {
        await _api.authenticated(session.token).post('/api/auth/logout');
      } catch (_) {
        // Clearing the local credential always signs out this device.
      }
    }
    await _store.clear();
    if (mounted) setState(() => _session = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_isRestoring) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final session = _session;
    if (session == null) return LoginScreen(onSubmit: _authenticate);

    return NexoShell(
      api: _api.authenticated(session.token),
      user: session.user,
      onSignOut: _signOut,
    );
  }
}
