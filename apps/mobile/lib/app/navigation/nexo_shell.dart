import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image/image.dart' as image;

import '../../core/network/nexo_api.dart';
import '../../features/auth/domain/nexo_session.dart';
import '../../features/capture/presentation/capture_sheet.dart';
import '../../features/modules/domain/nexo_module.dart';
import '../../features/modules/presentation/module_detail_screen.dart';
import '../../features/modules/presentation/modules_screen.dart';
import '../../features/observer/domain/observer_settings.dart';
import '../../features/observer/presentation/observer_screen.dart';
import '../../features/progress/presentation/progress_screen.dart';
import '../../features/today/presentation/today_screen.dart';

class NexoShell extends StatefulWidget {
  const NexoShell({
    required this.api,
    required this.user,
    required this.onSignOut,
    super.key,
  });

  final NexoApi api;
  final NexoUser user;
  final Future<void> Function() onSignOut;

  @override
  State<NexoShell> createState() => _NexoShellState();
}

class _NexoShellState extends State<NexoShell> {
  int _selectedIndex = 0;
  final List<CaptureDraft> _captures = [];
  bool _isLoadingCaptures = true;

  @override
  void initState() {
    super.initState();
    _loadCaptures();
  }

  Future<void> _loadCaptures() async {
    try {
      final data = await widget.api.get('/api/captures');
      final captures = (data['captures'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(CaptureDraft.fromApi)
          .toList();
      if (mounted) {
        setState(() {
          _captures
            ..clear()
            ..addAll(captures);
        });
      }
    } catch (error) {
      if (mounted) _showMessage(error.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _isLoadingCaptures = false);
    }
  }

  Future<void> _capture({
    NexoModule? module,
    List<NexoModule>? allowedModules,
  }) async {
    final draft = await showNexoCaptureSheet(
      context,
      initialModule: module,
      allowedModules: allowedModules,
    );
    if (!mounted || draft == null) return;
    await _saveCapture(draft);
  }

  Future<void> _saveCapture(CaptureDraft draft) async {
    try {
      if (draft.hasImage) {
        await _analyzeScreenshot(draft);
        return;
      }
      final data = await widget.api.post(
        '/api/captures',
        body: {'module': draft.module.id, 'content': draft.text},
      );
      _insertCapture(
        CaptureDraft.fromApi(data['capture'] as Map<String, dynamic>),
      );
    } catch (error) {
      if (mounted) _showMessage(error.toString(), isError: true);
    }
  }

  Future<void> _analyzeScreenshot(CaptureDraft draft) async {
    await _analyzeImageBytes(draft.imageBytes!, [
      draft.module,
    ], confirmBeforeSaving: true);
  }

  Future<CaptureDraft?> _analyzeObservedScreenshot(
    Uint8List bytes,
    List<ObserverScope> enabledScopes, {
    required bool confirmBeforeSaving,
  }) {
    final enabledModules = <NexoModule>{
      for (final scope in enabledScopes) scope.module,
    }.toList();
    return _analyzeImageBytes(
      bytes,
      enabledModules,
      enabledScopes: enabledScopes,
      confirmBeforeSaving: confirmBeforeSaving,
    );
  }

  Future<CaptureDraft?> _analyzeImageBytes(
    Uint8List bytes,
    List<NexoModule> enabledModules, {
    List<ObserverScope>? enabledScopes,
    required bool confirmBeforeSaving,
  }) async {
    if (enabledModules.isEmpty) {
      throw const NexoApiException('Activa al menos un módulo para analizar.');
    }
    _showMessage('Omi está analizando la captura…');
    final decoded = image.decodeImage(bytes);
    if (decoded == null) {
      throw const NexoApiException('La imagen seleccionada no es válida.');
    }
    final resized = decoded.width > 1400
        ? image.copyResize(decoded, width: 1400)
        : decoded;
    final jpeg = image.encodeJpg(resized, quality: 82);
    final analyzed = await widget.api.post(
      '/api/observer/analyze',
      body: {
        'imageDataUrl': 'data:image/jpeg;base64,${base64Encode(jpeg)}',
        'enabledModules': enabledModules.map((module) => module.id).toList(),
        if (enabledScopes != null)
          'enabledScopes': [
            for (final scope in enabledScopes)
              {'module': scope.module.id, 'submodule': scope.submodule},
          ],
      },
    );
    final detection = analyzed['detection'] as Map<String, dynamic>?;
    if (detection == null || detection['recognized'] != true) {
      throw NexoApiException(
        detection?['reason']?.toString() ??
            'No encontré un dato claro para guardar.',
      );
    }
    if (!mounted) return null;

    final content = detection['content']?.toString() ?? '';
    final submodule = detection['submodule']?.toString();
    final module =
        NexoModules.byId(detection['module']?.toString()) ??
        enabledModules.first;
    var confirmed = !confirmBeforeSaving;
    if (confirmBeforeSaving) {
      confirmed =
          await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: Text('Guardar en ${module.name}'),
              content: Text(content),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Guardar'),
                ),
              ],
            ),
          ) ==
          true;
    }
    if (!confirmed || !mounted) return null;

    final saved = await widget.api.post(
      '/api/observer/save',
      body: {
        'module': module.id,
        'submodule': submodule,
        'content': content,
        'confidence': detection['confidence'],
        'userConfirmed': confirmBeforeSaving,
      },
    );
    final capture = CaptureDraft.fromApi(
      saved['capture'] as Map<String, dynamic>,
    );
    _insertCapture(capture);
    return capture;
  }

  void _insertCapture(CaptureDraft capture) {
    if (!mounted) return;
    setState(() {
      _captures.insert(0, capture);
      _selectedIndex = 0;
    });
    _showMessage('Guardado en ${capture.module.name}.');
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          backgroundColor: isError ? const Color(0xFF842D42) : null,
        ),
      );
  }

  void _openModule(NexoModule module) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ModuleDetailScreen(
          module: module,
          onCapture: () => _capture(module: module),
          api: widget.api,
        ),
      ),
    );
  }

  void _openObserver() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ObserverScreen(
          api: widget.api,
          onCapture: _capture,
          onAnalyzeScreenshot: _analyzeObservedScreenshot,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      TodayScreen(
        captures: _captures,
        isLoading: _isLoadingCaptures,
        user: widget.user,
        onSignOut: widget.onSignOut,
        onCapture: _capture,
        onOpenModule: _openModule,
      ),
      ModulesScreen(onOpenModule: _openModule, onOpenObserver: _openObserver),
      const ProgressScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex == 2 ? 3 : _selectedIndex,
        onDestinationSelected: (index) {
          if (index == 2) {
            _capture();
            return;
          }
          setState(() => _selectedIndex = index > 2 ? index - 1 : index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.today_outlined),
            selectedIcon: Icon(Icons.today_rounded),
            label: 'Hoy',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view_rounded),
            label: 'Módulos',
          ),
          NavigationDestination(
            key: Key('capture-nav'),
            icon: Icon(Icons.add_circle_outline_rounded),
            selectedIcon: Icon(Icons.add_circle_rounded),
            label: 'Capturar',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights_rounded),
            label: 'Progreso',
          ),
        ],
      ),
    );
  }
}
