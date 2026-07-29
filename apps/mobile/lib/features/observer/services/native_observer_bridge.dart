import 'package:flutter/services.dart';

class NativeObserverEvent {
  const NativeObserverEvent._({
    required this.type,
    this.active,
    this.capturePath,
  });

  factory NativeObserverEvent.fromDynamic(dynamic value) {
    final map = value is Map ? Map<Object?, Object?>.from(value) : const {};
    final type = map['type']?.toString() ?? 'unknown';
    return NativeObserverEvent._(
      type: type,
      active: map['active'] as bool?,
      capturePath: map['path']?.toString(),
    );
  }

  final String type;
  final bool? active;
  final String? capturePath;
}

class NativeObserverBridge {
  static const _control = MethodChannel('nexo/observer_control');
  static const _events = EventChannel('nexo/observer_events');

  Stream<NativeObserverEvent> get events =>
      _events.receiveBroadcastStream().map(NativeObserverEvent.fromDynamic);

  Future<bool> isSupported() async {
    try {
      return await _control.invokeMethod<bool>('isSupported') ?? false;
    } on MissingPluginException {
      return false;
    }
  }

  Future<bool> canDrawOverlays() async {
    return await _control.invokeMethod<bool>('canDrawOverlays') ?? false;
  }

  Future<void> requestOverlayPermission() {
    return _control.invokeMethod<void>('requestOverlayPermission');
  }

  Future<void> startObserver() {
    return _control.invokeMethod<void>('startObserver');
  }

  Future<bool> requestNotificationPermission() async {
    return await _control.invokeMethod<bool>('requestNotificationPermission') ??
        false;
  }

  Future<void> stopObserver() {
    return _control.invokeMethod<void>('stopObserver');
  }

  Future<bool> isObserverRunning() async {
    return await _control.invokeMethod<bool>('isObserverRunning') ?? false;
  }

  Future<Uint8List> consumeCapture(String path) async {
    final bytes = await _control.invokeMethod<Uint8List>('consumeCapture', {
      'path': path,
    });
    if (bytes == null || bytes.isEmpty) {
      throw PlatformException(
        code: 'empty_capture',
        message: 'La captura está vacía.',
      );
    }
    return bytes;
  }

  Future<void> captureHandled() {
    return _control.invokeMethod<void>('captureHandled');
  }

  Future<void> notifyResult({required String title, required String summary}) {
    return _control.invokeMethod<void>('notifySaved', {
      'title': title,
      'summary': summary,
    });
  }
}
