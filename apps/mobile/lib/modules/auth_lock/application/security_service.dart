import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import '../../settings/application/settings_providers.dart';

const _pinKey = 'nexo_access_pin_v1';

final securityServiceProvider = Provider<SecurityService>((ref) {
  return SecurityService(
    ref.watch(settingsStorageProvider),
    LocalAuthentication(),
  );
});

class SecurityService {
  const SecurityService(this.storage, this.localAuth);

  final FlutterSecureStorage storage;
  final LocalAuthentication localAuth;

  Future<void> savePin(String pin) => storage.write(key: _pinKey, value: pin);

  Future<void> clearPin() => storage.delete(key: _pinKey);

  Future<bool> verifyPin(String pin) async =>
      await storage.read(key: _pinKey) == pin;

  Future<bool> canUseBiometrics() async {
    try {
      return await localAuth.isDeviceSupported() &&
          (await localAuth.getAvailableBiometrics()).isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  Future<bool> authenticate() async {
    try {
      return await localAuth.authenticate(
        localizedReason: 'Desbloquea Nexo para acceder a tus datos',
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
    } catch (_) {
      return false;
    }
  }
}
