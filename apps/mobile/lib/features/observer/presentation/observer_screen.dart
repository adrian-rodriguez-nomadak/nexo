import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/theme/nexo_theme.dart';
import '../../../core/network/nexo_api.dart';
import '../../capture/presentation/capture_sheet.dart';
import '../../modules/domain/nexo_module.dart';
import '../domain/observer_settings.dart';
import '../services/native_observer_bridge.dart';
import '../services/observer_announcer.dart';
import '../services/observer_preferences.dart';

class ObserverScreen extends StatefulWidget {
  const ObserverScreen({
    required this.api,
    required this.onCapture,
    required this.onAnalyzeScreenshot,
    super.key,
  });

  final NexoApi api;
  final Future<void> Function({
    NexoModule? module,
    List<NexoModule>? allowedModules,
  })
  onCapture;
  final Future<CaptureDraft?> Function(
    Uint8List bytes,
    List<ObserverScope> enabledScopes, {
    required bool confirmBeforeSaving,
  })
  onAnalyzeScreenshot;

  @override
  State<ObserverScreen> createState() => _ObserverScreenState();
}

class _ObserverScreenState extends State<ObserverScreen> {
  late List<ObserverModulePermission> _permissions;
  late final ObserverAnnouncer _announcer;
  late final ObserverPreferences _preferences;
  late final NativeObserverBridge _nativeBridge;
  StreamSubscription<NativeObserverEvent>? _nativeSubscription;
  bool _playSound = true;
  bool _speakSavedItems = true;
  bool _confirmBeforeSaving = true;
  bool _nativeSupported = false;
  bool _bubbleActive = false;
  bool _nativeBusy = false;

  int get _enabledCount =>
      _permissions.where((permission) => permission.enabled).length;

  List<NexoModule> get _enabledModules => _permissions
      .where((permission) => permission.enabled)
      .map((permission) => permission.module)
      .toList();

  List<ObserverScope> get _enabledScopes => _permissions
      .expand((permission) => permission.scopes)
      .where((scope) => scope.enabled)
      .toList();

  @override
  void initState() {
    super.initState();
    _permissions = ObserverSettings.defaults();
    _announcer = ObserverAnnouncer();
    _preferences = ObserverPreferences();
    _nativeBridge = NativeObserverBridge();
    _loadPreferences();
    _initializeNativeObserver();
  }

  @override
  void dispose() {
    _nativeSubscription?.cancel();
    if (_bubbleActive) unawaited(_nativeBridge.stopObserver());
    _announcer.stop();
    super.dispose();
  }

  Future<void> _initializeNativeObserver() async {
    final supported = await _nativeBridge.isSupported();
    if (!mounted) return;
    setState(() => _nativeSupported = supported);
    if (!supported) return;

    _nativeSubscription = _nativeBridge.events.listen(
      _handleNativeEvent,
      onError: (_) {},
    );
    final active = await _nativeBridge.isObserverRunning();
    if (mounted) setState(() => _bubbleActive = active);
  }

  Future<void> _handleNativeEvent(NativeObserverEvent event) async {
    if (!mounted) return;
    if (event.type == 'state') {
      setState(() => _bubbleActive = event.active ?? false);
      return;
    }
    final path = event.capturePath;
    if (event.type != 'capture' || path == null || _nativeBusy) return;

    setState(() => _nativeBusy = true);
    try {
      final bytes = await _nativeBridge.consumeCapture(path);
      final capture = await widget.onAnalyzeScreenshot(
        bytes,
        _enabledScopes,
        confirmBeforeSaving: false,
      );
      if (capture != null) {
        await _nativeBridge.notifyResult(
          title: 'Guardado en ${capture.module.name}',
          summary: capture.text,
        );
        await _announcer.announceSaved(
          moduleName: capture.module.name,
          summary: capture.text,
          playSound: _playSound,
          speak: _speakSavedItems,
        );
      }
    } catch (error) {
      final message = _platformMessage(error);
      await _nativeBridge.notifyResult(
        title: 'El Observador no guardó nada',
        summary: message,
      );
      if (mounted) _showMessage(message);
    } finally {
      await _nativeBridge.captureHandled();
      if (mounted) setState(() => _nativeBusy = false);
    }
  }

  Future<void> _loadPreferences() async {
    final stored = await _preferences.load(
      _permissions.expand((permission) => permission.scopes),
    );
    if (!mounted) return;
    setState(() {
      _permissions = [
        for (final permission in _permissions)
          ObserverModulePermission(
            module: permission.module,
            scopes: [
              for (final scope in permission.scopes)
                scope.copyWith(
                  enabled: stored.enabledScopeIds.contains(scope.id),
                ),
            ],
          ),
      ];
      _playSound = stored.playSound;
      _speakSavedItems = stored.speakSavedItems;
      _confirmBeforeSaving = stored.confirmBeforeSaving;
    });
  }

  void _togglePermission(int index, bool enabled) {
    final permission = _permissions[index];
    setState(() {
      _permissions[index] = permission.setAll(enabled);
    });
    _preferences.saveModule(permission, enabled);
  }

  void _toggleScope(int moduleIndex, int scopeIndex, bool enabled) {
    final permission = _permissions[moduleIndex];
    final scope = permission.scopes[scopeIndex];
    setState(() {
      _permissions[moduleIndex] = permission.setScope(scope.submodule, enabled);
    });
    _preferences.saveScope(scope, enabled);
  }

  void _updateNotificationSettings({
    bool? playSound,
    bool? speakSavedItems,
    bool? confirmBeforeSaving,
  }) {
    setState(() {
      _playSound = playSound ?? _playSound;
      _speakSavedItems = speakSavedItems ?? _speakSavedItems;
      _confirmBeforeSaving = confirmBeforeSaving ?? _confirmBeforeSaving;
    });
    _preferences.saveNotificationSettings(
      playSound: _playSound,
      speakSavedItems: _speakSavedItems,
      confirmBeforeSaving: _confirmBeforeSaving,
    );
  }

  Future<void> _captureScreenshot() async {
    if (!_validateModules()) return;
    final enabled = _enabledModules;
    await widget.onCapture(
      module: enabled.length == 1 ? enabled.first : null,
      allowedModules: enabled,
    );
  }

  Future<void> _toggleBubble() async {
    if (!_validateModules() || _nativeBusy) return;
    if (!_nativeSupported) {
      await _captureScreenshot();
      return;
    }

    setState(() => _nativeBusy = true);
    try {
      if (_bubbleActive) {
        await _nativeBridge.stopObserver();
        if (mounted) setState(() => _bubbleActive = false);
        return;
      }
      final canOverlay = await _nativeBridge.canDrawOverlays();
      if (!canOverlay) {
        await _nativeBridge.requestOverlayPermission();
        if (mounted) {
          _showMessage(
            'Activa “Mostrar sobre otras apps” y vuelve a tocar Activar burbuja.',
          );
        }
        return;
      }
      await _nativeBridge.requestNotificationPermission();
      await _nativeBridge.startObserver();
    } catch (error) {
      if (mounted) _showMessage(_platformMessage(error));
    } finally {
      if (mounted) setState(() => _nativeBusy = false);
    }
  }

  bool _validateModules() {
    if (_enabledCount > 0) return true;
    _showMessage('Activa al menos un módulo para comenzar.');
    return false;
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
      );
  }

  String _platformMessage(Object error) {
    if (error is PlatformException && error.message?.isNotEmpty == true) {
      return error.message!;
    }
    return error.toString();
  }

  Future<void> _testAnnouncement() async {
    await _announcer.announceSaved(
      moduleName: 'Finanzas',
      summary: 'Gasto de 450 pesos en gasolina.',
      playSound: _playSound,
      speak: _speakSavedItems,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: NexoColors.background,
        surfaceTintColor: Colors.transparent,
        title: const Text('Observador'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 36),
          children: [
            _SessionCard(
              enabledCount: _enabledCount,
              enabledScopeCount: _enabledScopes.length,
              nativeSupported: _nativeSupported,
              bubbleActive: _bubbleActive,
              busy: _nativeBusy,
              onToggleBubble: _toggleBubble,
              onPickScreenshot: _captureScreenshot,
            ),
            const SizedBox(height: 28),
            Text(
              'A qué debe prestar atención',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Omi ignorará lo que no pertenezca a los módulos que autorices.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 14),
            ...List.generate(_permissions.length, (index) {
              final permission = _permissions[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _PermissionTile(
                  permission: permission,
                  onChanged: (enabled) => _togglePermission(index, enabled),
                  onScopeChanged: (scopeIndex, enabled) =>
                      _toggleScope(index, scopeIndex, enabled),
                ),
              );
            }),
            const SizedBox(height: 18),
            Text(
              'Avisos y guardado',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 12),
            _SettingsCard(
              playSound: _playSound,
              speakSavedItems: _speakSavedItems,
              confirmBeforeSaving: _confirmBeforeSaving,
              onPlaySoundChanged: (value) =>
                  _updateNotificationSettings(playSound: value),
              onSpeakChanged: (value) =>
                  _updateNotificationSettings(speakSavedItems: value),
              onConfirmChanged: (value) =>
                  _updateNotificationSettings(confirmBeforeSaving: value),
              onTest: _testAnnouncement,
            ),
            const SizedBox(height: 18),
            const _PrivacyNotice(),
          ],
        ),
      ),
    );
  }
}

class _SessionCard extends StatelessWidget {
  const _SessionCard({
    required this.enabledCount,
    required this.enabledScopeCount,
    required this.nativeSupported,
    required this.bubbleActive,
    required this.busy,
    required this.onToggleBubble,
    required this.onPickScreenshot,
  });

  final int enabledCount;
  final int enabledScopeCount;
  final bool nativeSupported;
  final bool bubbleActive;
  final bool busy;
  final VoidCallback onToggleBubble;
  final VoidCallback onPickScreenshot;

  @override
  Widget build(BuildContext context) {
    const color = NexoColors.lime;
    final moduleLabel = enabledCount == 1
        ? '1 módulo'
        : '$enabledCount módulos';
    final scopeLabel = enabledScopeCount == 1
        ? '1 submódulo'
        : '$enabledScopeCount submódulos';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: color.withValues(alpha: 0.42)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.bubble_chart_rounded, color: color),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bubbleActive
                          ? 'Burbuja activa'
                          : 'Observador por burbuja',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text(
                      '$moduleLabel · $scopeLabel',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              if (bubbleActive)
                const SizedBox.square(
                  dimension: 10,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              key: const Key('observer-session-button'),
              onPressed: busy ? null : onToggleBubble,
              style: FilledButton.styleFrom(backgroundColor: color),
              icon: busy
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      bubbleActive
                          ? Icons.stop_rounded
                          : nativeSupported
                          ? Icons.bubble_chart_rounded
                          : Icons.add_photo_alternate_outlined,
                    ),
              label: Text(
                busy
                    ? 'Procesando…'
                    : bubbleActive
                    ? 'Detener burbuja'
                    : nativeSupported
                    ? 'Activar burbuja'
                    : 'Elegir captura de Fotos',
              ),
            ),
          ),
          if (nativeSupported) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: busy ? null : onPickScreenshot,
                icon: const Icon(Icons.photo_library_outlined),
                label: const Text('Elegir desde Fotos'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PermissionTile extends StatelessWidget {
  const _PermissionTile({
    required this.permission,
    required this.onChanged,
    required this.onScopeChanged,
  });

  final ObserverModulePermission permission;
  final ValueChanged<bool> onChanged;
  final void Function(int index, bool enabled) onScopeChanged;

  @override
  Widget build(BuildContext context) {
    final module = permission.module;
    return Container(
      decoration: BoxDecoration(
        color: NexoColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: permission.enabled
              ? module.color.withValues(alpha: 0.5)
              : NexoColors.border,
        ),
      ),
      child: Column(
        children: [
          SwitchListTile(
            key: Key('observer-permission-${module.id}'),
            value: permission.enabled,
            onChanged: onChanged,
            activeTrackColor: module.color,
            secondary: Icon(module.icon, color: module.color),
            title: Text(module.name),
            subtitle: Text(
              '${permission.enabledCount} de ${permission.scopes.length} submódulos activos',
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
            child: Wrap(
              spacing: 7,
              runSpacing: 7,
              children: [
                for (var index = 0; index < permission.scopes.length; index++)
                  FilterChip(
                    key: Key(
                      'observer-scope-${module.id}-${permission.scopes[index].submodule}',
                    ),
                    selected: permission.scopes[index].enabled,
                    onSelected: (enabled) => onScopeChanged(index, enabled),
                    selectedColor: module.color.withValues(alpha: 0.28),
                    side: BorderSide(
                      color: permission.scopes[index].enabled
                          ? module.color
                          : NexoColors.border,
                    ),
                    avatar: permission.scopes[index].enabled
                        ? Icon(
                            Icons.check_rounded,
                            size: 16,
                            color: module.color,
                          )
                        : null,
                    label: Text(permission.scopes[index].name),
                    tooltip: permission.scopes[index].attentionRule,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({
    required this.playSound,
    required this.speakSavedItems,
    required this.confirmBeforeSaving,
    required this.onPlaySoundChanged,
    required this.onSpeakChanged,
    required this.onConfirmChanged,
    required this.onTest,
  });

  final bool playSound;
  final bool speakSavedItems;
  final bool confirmBeforeSaving;
  final ValueChanged<bool> onPlaySoundChanged;
  final ValueChanged<bool> onSpeakChanged;
  final ValueChanged<bool> onConfirmChanged;
  final VoidCallback onTest;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: NexoColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: NexoColors.border),
      ),
      child: Column(
        children: [
          SwitchListTile(
            value: playSound,
            onChanged: onPlaySoundChanged,
            secondary: const Icon(Icons.notifications_active_outlined),
            title: const Text('Sonido de notificación'),
          ),
          const Divider(height: 1),
          SwitchListTile(
            value: speakSavedItems,
            onChanged: onSpeakChanged,
            secondary: const Icon(Icons.record_voice_over_outlined),
            title: const Text('Decir en voz alta lo guardado'),
            subtitle: const Text(
              'Ej. “Guardado en Finanzas: gasto de 450 pesos”.',
            ),
          ),
          const Divider(height: 1),
          SwitchListTile(
            value: confirmBeforeSaving,
            onChanged: onConfirmChanged,
            secondary: const Icon(Icons.fact_check_outlined),
            title: const Text('Confirmar capturas manuales'),
            subtitle: const Text(
              'La burbuja guarda en segundo plano y avisa con una notificación.',
            ),
          ),
          const Divider(height: 1),
          ListTile(
            onTap: onTest,
            leading: const Icon(Icons.volume_up_outlined),
            title: const Text('Probar sonido y voz'),
            trailing: const Icon(Icons.chevron_right_rounded),
          ),
        ],
      ),
    );
  }
}

class _PrivacyNotice extends StatelessWidget {
  const _PrivacyNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NexoColors.surfaceHigh,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.shield_outlined, color: NexoColors.muted, size: 20),
          const SizedBox(width: 11),
          Expanded(
            child: Text(
              'Android siempre mostrará una notificación mientras la burbuja '
              'esté activa. Nexo sólo toma una imagen cuando la tocas; no '
              'almacena un video de tus movimientos.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}
