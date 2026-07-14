import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_repository.dart';
import '../domain/auth_session.dart';
import '../../../core/http/api_client.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => const AuthRepository(),
);

final authSessionProvider =
    AsyncNotifierProvider<AuthSessionController, AuthSession?>(
      AuthSessionController.new,
    );

class AuthSessionController extends AsyncNotifier<AuthSession?> {
  Future<bool>? _refreshInFlight;
  AuthRepository get _repository => ref.read(authRepositoryProvider);

  @override
  Future<AuthSession?> build() => _repository.restore();

  Future<bool> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _repository.login(email: email, password: password),
    );
    return !state.hasError;
  }

  Future<bool> register(String name, String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _repository.register(name: name, email: email, password: password),
    );
    return !state.hasError;
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AsyncData(null);
  }

  Future<bool> refresh() async {
    final active = _refreshInFlight;
    if (active != null) return active;
    final future = _refreshOnce();
    _refreshInFlight = future;
    try {
      return await future;
    } finally {
      _refreshInFlight = null;
    }
  }

  Future<bool> _refreshOnce() async {
    final restored = await _repository.restore();
    state = AsyncData(restored);
    return restored != null;
  }
}

final accessTokenProvider = Provider<String?>((ref) {
  return ref.watch(authSessionProvider).value?.accessToken;
});

final authenticatedApiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    accessToken: () async => ref.read(accessTokenProvider),
    refreshSession: () => ref.read(authSessionProvider.notifier).refresh(),
  );
});
