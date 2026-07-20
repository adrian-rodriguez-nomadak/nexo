import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

class MemorySecuritySettings {
  const MemorySecuritySettings({
    this.biometricsEnabled = false,
    this.pinEnabled = false,
    this.lockOnExit = false,
  });

  final bool biometricsEnabled;
  final bool pinEnabled;
  final bool lockOnExit;

  MemorySecuritySettings copyWith({
    bool? biometricsEnabled,
    bool? pinEnabled,
    bool? lockOnExit,
  }) {
    return MemorySecuritySettings(
      biometricsEnabled: biometricsEnabled ?? this.biometricsEnabled,
      pinEnabled: pinEnabled ?? this.pinEnabled,
      lockOnExit: lockOnExit ?? this.lockOnExit,
    );
  }

  Map<String, Object?> toJson() => {
    'biometricsEnabled': biometricsEnabled,
    'pinEnabled': pinEnabled,
    'lockOnExit': lockOnExit,
  };

  factory MemorySecuritySettings.fromJson(Map<String, dynamic> json) {
    return MemorySecuritySettings(
      biometricsEnabled: json['biometricsEnabled'] == true,
      pinEnabled: json['pinEnabled'] == true,
      lockOnExit: json['lockOnExit'] == true,
    );
  }
}

class MemorySecurityController extends ChangeNotifier
    with WidgetsBindingObserver {
  MemorySecurityController({
    FlutterSecureStorage storage = const FlutterSecureStorage(),
    LocalAuthentication? localAuthentication,
  }) : _storage = storage,
       _localAuth = localAuthentication ?? LocalAuthentication();

  static const _settingsKey = 'nexo_memory_security_settings_v1';
  static const _pinKey = 'nexo_memory_pin_v1';

  final FlutterSecureStorage _storage;
  final LocalAuthentication _localAuth;

  MemorySecuritySettings settings = const MemorySecuritySettings();
  bool initialized = false;
  bool locked = false;
  bool authenticating = false;
  bool biometricsAvailable = false;
  bool obscureContent = false;
  String? message;

  bool _backgrounded = false;
  bool _automaticAttemptMade = false;
  DateTime _ignoreLifecycleUntil = DateTime.fromMillisecondsSinceEpoch(0);

  Future<void> initialize() async {
    WidgetsBinding.instance.addObserver(this);
    try {
      final raw = await _storage.read(key: _settingsKey);
      if (raw != null) {
        settings = MemorySecuritySettings.fromJson(
          Map<String, dynamic>.from(jsonDecode(raw) as Map),
        );
      }
      biometricsAvailable = await _canUseBiometrics();
      locked =
          settings.lockOnExit &&
          (settings.pinEnabled || settings.biometricsEnabled);
    } catch (_) {
      message = 'No se pudo cargar la configuración de seguridad.';
    }
    initialized = true;
    notifyListeners();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!initialized || authenticating) return;
    if (DateTime.now().isBefore(_ignoreLifecycleUntil)) return;

    if (state == AppLifecycleState.inactive) {
      obscureContent = true;
      notifyListeners();
      return;
    }
    // Only paused/hidden count as leaving Nexo. The biometric sheet commonly
    // emits inactive, which must never trigger another authentication cycle.
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      _backgrounded = true;
      obscureContent = true;
      notifyListeners();
      return;
    }
    if (state == AppLifecycleState.resumed && _backgrounded) {
      _backgrounded = false;
      obscureContent = false;
      if (settings.lockOnExit) lock();
      notifyListeners();
    } else if (state == AppLifecycleState.resumed && obscureContent) {
      obscureContent = false;
      notifyListeners();
    }
  }

  void lock() {
    if (!settings.pinEnabled && !settings.biometricsEnabled) return;
    locked = true;
    message = null;
    _automaticAttemptMade = false;
    notifyListeners();
  }

  Future<bool> authenticateBiometrically({bool automatic = false}) async {
    if (authenticating || !locked || !settings.biometricsEnabled) return false;
    if (automatic && _automaticAttemptMade) return false;
    if (automatic) _automaticAttemptMade = true;
    authenticating = true;
    message = null;
    _ignoreLifecycleUntil = DateTime.now().add(const Duration(seconds: 3));
    notifyListeners();

    var success = false;
    try {
      success = await _localAuth.authenticate(
        localizedReason: 'Desbloquea Nexo para acceder a tus recuerdos',
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
    } catch (_) {
      message =
          'No se pudo usar la biometría. Puedes desbloquear con tu PIN.';
    } finally {
      authenticating = false;
      _backgrounded = false;
      _ignoreLifecycleUntil = DateTime.now().add(
        const Duration(seconds: 2),
      );
    }
    if (success) {
      locked = false;
      message = null;
    } else {
      message ??= 'No se desbloqueó. Intenta de nuevo o usa tu PIN.';
    }
    notifyListeners();
    return success;
  }

  Future<bool> verifyPin(String pin) async {
    if (authenticating) return false;
    authenticating = true;
    notifyListeners();
    final saved = await _storage.read(key: _pinKey);
    final success = saved != null && saved == pin;
    authenticating = false;
    if (success) {
      locked = false;
      message = null;
    } else {
      message = 'PIN incorrecto.';
    }
    notifyListeners();
    return success;
  }

  Future<void> setPin(String pin) async {
    if (!RegExp(r'^\d{4}$').hasMatch(pin)) {
      throw const FormatException('El PIN debe tener cuatro números.');
    }
    await _storage.write(key: _pinKey, value: pin);
    settings = settings.copyWith(pinEnabled: true);
    await _saveSettings();
  }

  Future<void> disablePin() async {
    await _storage.delete(key: _pinKey);
    settings = settings.copyWith(
      pinEnabled: false,
      lockOnExit: settings.biometricsEnabled && settings.lockOnExit,
    );
    await _saveSettings();
  }

  Future<bool> enableBiometrics() async {
    if (!biometricsAvailable || authenticating) return false;
    authenticating = true;
    _ignoreLifecycleUntil = DateTime.now().add(const Duration(seconds: 3));
    notifyListeners();
    var success = false;
    try {
      success = await _localAuth.authenticate(
        localizedReason: 'Confirma tu identidad para proteger Nexo',
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
    } catch (_) {
      message = 'La biometría no está disponible o no tiene permiso.';
    } finally {
      authenticating = false;
      _backgrounded = false;
      _ignoreLifecycleUntil = DateTime.now().add(
        const Duration(seconds: 2),
      );
    }
    if (success) {
      settings = settings.copyWith(biometricsEnabled: true);
      await _saveSettings();
    } else {
      notifyListeners();
    }
    return success;
  }

  Future<void> disableBiometrics() async {
    settings = settings.copyWith(
      biometricsEnabled: false,
      lockOnExit: settings.pinEnabled && settings.lockOnExit,
    );
    await _saveSettings();
  }

  Future<void> setLockOnExit(bool enabled) async {
    if (enabled && !settings.pinEnabled && !settings.biometricsEnabled) {
      message = 'Configura un PIN o biometría antes de activar el bloqueo.';
      notifyListeners();
      return;
    }
    settings = settings.copyWith(lockOnExit: enabled);
    await _saveSettings();
  }

  Future<void> _saveSettings() async {
    await _storage.write(
      key: _settingsKey,
      value: jsonEncode(settings.toJson()),
    );
    notifyListeners();
  }

  Future<bool> _canUseBiometrics() async {
    try {
      return await _localAuth.isDeviceSupported() &&
          (await _localAuth.getAvailableBiometrics()).isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}

class MemorySecurityScope extends InheritedNotifier<MemorySecurityController> {
  const MemorySecurityScope({
    required MemorySecurityController controller,
    required super.child,
    super.key,
  }) : super(notifier: controller);

  static MemorySecurityController? maybeOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<MemorySecurityScope>()
        ?.notifier;
  }
}

class MemorySecurityGate extends StatefulWidget {
  const MemorySecurityGate({required this.child, super.key});
  final Widget child;

  @override
  State<MemorySecurityGate> createState() => _MemorySecurityGateState();
}

class _MemorySecurityGateState extends State<MemorySecurityGate> {
  late final MemorySecurityController _controller;

  @override
  void initState() {
    super.initState();
    _controller = MemorySecurityController()..addListener(_refresh);
    _controller.initialize().then((_) {
      if (!mounted ||
          !_controller.locked ||
          !_controller.settings.biometricsEnabled) {
        return;
      }
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _controller.authenticateBiometrically(automatic: true);
        }
      });
    });
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_refresh)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MemorySecurityScope(
      controller: _controller,
      child: !_controller.initialized
          ? const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            )
          : _controller.locked
          ? MemoryUnlockScreen(controller: _controller)
          : Stack(
              children: [
                widget.child,
                if (_controller.obscureContent)
                  const Positioned.fill(child: _PrivacyShield()),
              ],
            ),
    );
  }
}

class _PrivacyShield extends StatelessWidget {
  const _PrivacyShield();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Color(0xFF211F2C),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.shield_outlined, color: Color(0xFFC7BEFF), size: 48),
            SizedBox(height: 16),
            Text(
              'Nexo',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w900,
              ),
            ),
            SizedBox(height: 6),
            Text(
              'Tus recuerdos están protegidos',
              style: TextStyle(color: Color(0xFFD8D5E2)),
            ),
          ],
        ),
      ),
    );
  }
}

class MemoryUnlockScreen extends StatefulWidget {
  const MemoryUnlockScreen({required this.controller, super.key});
  final MemorySecurityController controller;

  @override
  State<MemoryUnlockScreen> createState() => _MemoryUnlockScreenState();
}

class _MemoryUnlockScreenState extends State<MemoryUnlockScreen> {
  String _pin = '';

  void _digit(String digit) {
    if (_pin.length >= 4 || widget.controller.authenticating) return;
    setState(() => _pin += digit);
    if (_pin.length == 4) {
      final attempt = _pin;
      widget.controller.verifyPin(attempt).then((success) {
        if (mounted && !success) setState(() => _pin = '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(28, 56, 28, 36),
          children: [
            const Icon(
              Icons.lock_rounded,
              size: 44,
              color: Color(0xFF6656D9),
            ),
            const SizedBox(height: 22),
            const Text(
              'Nexo está bloqueado',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            const Text(
              'Tus recuerdos permanecen ocultos.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF77736C)),
            ),
            if (widget.controller.settings.pinEnabled) ...[
              const SizedBox(height: 34),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  4,
                  (index) => Container(
                    width: 14,
                    height: 14,
                    margin: const EdgeInsets.symmetric(horizontal: 7),
                    decoration: BoxDecoration(
                      color: index < _pin.length
                          ? const Color(0xFF6656D9)
                          : Colors.transparent,
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFF6656D9)),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.55,
                children: [
                  for (final digit in [
                    '1',
                    '2',
                    '3',
                    '4',
                    '5',
                    '6',
                    '7',
                    '8',
                    '9',
                    '',
                    '0',
                  ])
                    digit.isEmpty
                        ? const SizedBox.shrink()
                        : TextButton(
                            onPressed: () => _digit(digit),
                            child: Text(
                              digit,
                              style: const TextStyle(fontSize: 22),
                            ),
                          ),
                  IconButton(
                    onPressed: _pin.isEmpty
                        ? null
                        : () => setState(
                            () => _pin = _pin.substring(0, _pin.length - 1),
                          ),
                    icon: const Icon(Icons.backspace_outlined),
                  ),
                ],
              ),
            ],
            if (widget.controller.settings.biometricsEnabled) ...[
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: widget.controller.authenticating
                    ? null
                    : widget.controller.authenticateBiometrically,
                icon: const Icon(Icons.fingerprint_rounded),
                label: Text(
                  widget.controller.authenticating
                      ? 'Verificando…'
                      : 'Usar huella o Face ID',
                ),
              ),
            ],
            if (widget.controller.message != null) ...[
              const SizedBox(height: 14),
              Text(
                widget.controller.message!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF9E3535)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
