import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/app_settings.dart';

const _settingsKey = 'nexo_app_settings_v1';

final settingsStorageProvider = Provider<FlutterSecureStorage>(
  (_) => const FlutterSecureStorage(),
);

final appSettingsProvider =
    AsyncNotifierProvider<AppSettingsController, AppSettings>(
      AppSettingsController.new,
    );

class AppSettingsController extends AsyncNotifier<AppSettings> {
  FlutterSecureStorage get _storage => ref.read(settingsStorageProvider);

  @override
  Future<AppSettings> build() async {
    final raw = await _storage.read(key: _settingsKey);
    if (raw == null) return const AppSettings();
    try {
      return AppSettings.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return const AppSettings();
    }
  }

  Future<void> persist(AppSettings Function(AppSettings current) change) async {
    final current = state.value ?? const AppSettings();
    final next = change(current);
    state = AsyncData(next);
    await _storage.write(key: _settingsKey, value: jsonEncode(next.toJson()));
  }
}
