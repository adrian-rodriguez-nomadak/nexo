import 'dart:async';

import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

import '../data/memory_analysis_service.dart';
import '../data/memory_repository.dart';
import '../data/voice_transcription_service.dart';
import '../domain/memory_analysis.dart';
import '../domain/memory_entry.dart';
import 'memory_graph_view.dart';
import 'memory_insights_view.dart';
import '../security/memory_security.dart';

enum PlanMode { free, premium }

class MemoryHome extends StatefulWidget {
  const MemoryHome({super.key});

  @override
  State<MemoryHome> createState() => _MemoryHomeState();
}

class _MemoryHomeState extends State<MemoryHome> {
  int _section = 0;
  PlanMode _mode = PlanMode.free;
  final List<MemoryEntry> _entries = [];
  final MemoryRepository _repository = MemoryRepository();
  bool _loading = true;
  String? _storageError;

  @override
  void initState() {
    super.initState();
    _loadEntries();
  }

  Future<void> _loadEntries() async {
    try {
      final entries = await _repository.load();
      if (!mounted) return;
      setState(() {
        _entries
          ..clear()
          ..addAll(entries);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _storageError = 'No pudimos abrir tus recuerdos guardados.';
      });
    }
  }

  Future<void> _persist() async {
    try {
      await _repository.save(_entries);
      if (mounted && _storageError != null) {
        setState(() => _storageError = null);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _storageError =
            'El cambio está visible, pero no se pudo guardar en el dispositivo.';
      });
    }
  }

  void _addEntry(MemoryEntry entry) {
    setState(() => _entries.insert(0, entry));
    _persist();
  }

  void _updateEntry(MemoryEntry entry) {
    final index = _entries.indexWhere((item) => item.id == entry.id);
    if (index == -1) return;
    setState(() {
      _entries[index] = entry;
      _entries.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    });
    _persist();
  }

  void _deleteEntry(String id) {
    setState(() => _entries.removeWhere((entry) => entry.id == id));
    _persist();
  }

  Future<void> _openEntry(MemoryEntry entry) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF8F7F3),
      builder: (sheetContext) => MemoryDetailSheet(
        entry: entry,
        onUpdated: (updated) {
          _updateEntry(updated);
          Navigator.pop(sheetContext);
        },
        onDeleted: () {
          _deleteEntry(entry.id);
          Navigator.pop(sheetContext);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      CaptureView(
        mode: _mode,
        entries: _entries,
        onModeChanged: (mode) => setState(() => _mode = mode),
        onSaved: _addEntry,
      ),
      TimelineView(
        entries: _entries,
        onUpdated: _updateEntry,
        onDeleted: _deleteEntry,
      ),
      ConnectionsView(
        entries: _entries,
        onEntryTap: _openEntry,
      ),
      SummaryView(entries: _entries),
      SettingsView(
        mode: _mode,
        onModeChanged: (mode) => setState(() => _mode = mode),
      ),
    ];

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else
              pages[_section],
            if (_storageError != null)
              Positioned(
                left: 16,
                right: 16,
                bottom: 12,
                child: Material(
                  color: const Color(0xFF812B2B),
                  borderRadius: BorderRadius.circular(14),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      _storageError!,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _section,
        onDestinationSelected: (value) => setState(() => _section = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline_rounded),
            label: 'Entrada',
          ),
          NavigationDestination(
            icon: Icon(Icons.view_timeline_outlined),
            label: 'Tiempo',
          ),
          NavigationDestination(icon: Icon(Icons.hub_outlined), label: 'Mapa'),
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            label: 'Resumen',
          ),
          NavigationDestination(
            icon: Icon(Icons.tune_rounded),
            label: 'Ajustes',
          ),
        ],
      ),
    );
  }
}

class CaptureView extends StatefulWidget {
  const CaptureView({
    required this.mode,
    required this.entries,
    required this.onModeChanged,
    required this.onSaved,
    super.key,
  });

  final PlanMode mode;
  final List<MemoryEntry> entries;
  final ValueChanged<PlanMode> onModeChanged;
  final ValueChanged<MemoryEntry> onSaved;

  @override
  State<CaptureView> createState() => _CaptureViewState();
}

class _CaptureViewState extends State<CaptureView> {
  final _note = TextEditingController();
  final VoiceTranscriptionService _voice = VoiceTranscriptionService();
  final MemoryAnalysisService _analysisService = const MemoryAnalysisService();
  List<String> _questions = [];
  MemoryAnalysis? _pendingAnalysis;
  final Map<String, TextEditingController> _answers = {};
  bool _listening = false;
  bool _voiceMode = false;
  bool _preparingVoice = false;
  String? _voiceError;
  int _recordingSeconds = 0;
  Timer? _recordingTimer;
  bool _analyzing = false;
  bool _usingLocalAnalysis = false;

  @override
  void dispose() {
    _recordingTimer?.cancel();
    _voice.cancel();
    _note.dispose();
    for (final controller in _answers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _toggleListening() async {
    if (_preparingVoice) return;
    if (_listening) {
      await _stopListening();
      return;
    }
    setState(() {
      _preparingVoice = true;
      _voiceError = null;
    });
    final available = await _voice.initialize(
      onStatus: (status) {
        if ((status == 'done' || status == 'notListening') && mounted) {
          _finishListeningState();
        }
      },
      onError: (message) {
        if (!mounted) return;
        setState(() => _voiceError = _friendlyVoiceError(message));
        _finishListeningState();
      },
    );
    if (!mounted) return;
    if (!available) {
      setState(() {
        _preparingVoice = false;
        _voiceError =
            'El reconocimiento de voz no está disponible en este dispositivo.';
      });
      return;
    }
    setState(() {
      _preparingVoice = false;
      _listening = true;
      _recordingSeconds = 0;
    });
    _recordingTimer?.cancel();
    _recordingTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _listening) {
        setState(() => _recordingSeconds++);
      }
    });
    await _voice.start(
      onResult: (text, isFinal) {
        if (!mounted) return;
        setState(() {
          _note.text = text;
          _note.selection = TextSelection.collapsed(offset: text.length);
        });
        if (isFinal) _finishListeningState();
      },
    );
  }

  Future<void> _stopListening() async {
    await _voice.stop();
    _finishListeningState();
  }

  Future<void> _cancelListening() async {
    await _voice.cancel();
    if (!mounted) return;
    setState(() {
      _note.clear();
      _voiceError = null;
    });
    _finishListeningState();
  }

  void _finishListeningState() {
    _recordingTimer?.cancel();
    if (!mounted) return;
    setState(() {
      _listening = false;
      _preparingVoice = false;
    });
  }

  String _friendlyVoiceError(String message) {
    final lower = message.toLowerCase();
    if (lower.contains('permission') || lower.contains('denied')) {
      return 'Activa el permiso de micrófono y reconocimiento de voz en Ajustes.';
    }
    if (lower.contains('network')) {
      return 'No hay conexión para transcribir. Tu texto actual no se perderá.';
    }
    if (lower.contains('no_match')) {
      return 'No pude reconocer lo que dijiste. Intenta hablar un poco más cerca.';
    }
    return 'La transcripción se detuvo. Puedes intentarlo otra vez.';
  }

  String get _recordingTime {
    final minutes = (_recordingSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (_recordingSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  Future<void> _analyze() async {
    final text = _note.text.trim();
    if (text.isEmpty || _analyzing) return;
    if (_listening) await _stopListening();
    setState(() {
      _analyzing = true;
      _usingLocalAnalysis = false;
    });
    for (final controller in _answers.values) {
      controller.dispose();
    }
    _answers.clear();
    MemoryAnalysis? analysis;
    try {
      analysis = await _analysisService.analyze(
        text: text,
        premium: widget.mode == PlanMode.premium,
        previousEntries: widget.entries,
      );
    } catch (_) {
      analysis = null;
    }
    if (!mounted) return;
    final suggestions = analysis?.questions.isNotEmpty == true
        ? analysis!.questions
        : _feedbackFor(text);
    final limit = widget.mode == PlanMode.free ? 3 : suggestions.length;
    setState(() {
      _analyzing = false;
      _pendingAnalysis = analysis;
      _usingLocalAnalysis = analysis == null;
      _questions = suggestions.take(limit).toList();
      for (final question in _questions) {
        _answers[question] = TextEditingController();
      }
    });
  }

  List<String> _feedbackFor(String text) {
    final lower = text.toLowerCase();
    final result = <String>[];
    if (lower.contains('sueño') || lower.contains('cansad')) {
      result.add('¿Cuántas horas dormiste y por qué crees que tenías sueño?');
    }
    if (lower.contains('uber') || lower.contains('taxi')) {
      result.add('¿Sueles moverte así o hoy fue algo excepcional?');
    }
    if (lower.contains('hablé') ||
        lower.contains('hable') ||
        lower.contains('persona')) {
      result.add(
        '¿Con quién hablaste y qué fue lo importante de la conversación?',
      );
    }
    if (lower.contains('gimnasio') || lower.contains('entren')) {
      result.add('¿Qué entrenaste y cómo te sentiste al terminar?');
    }
    if (lower.contains('trabaj')) {
      result.add('¿Qué fue lo más importante que avanzaste en el trabajo?');
    }
    if (result.isEmpty) {
      result.addAll([
        '¿Qué parte de esto te gustaría recordar dentro de un mes?',
        '¿Cómo te hizo sentir?',
        '¿Hay alguna persona, lugar o proyecto relacionado?',
        '¿Qué ocurrió justo antes o después?',
      ]);
    }
    if (result.length < 3) {
      result.addAll([
        '¿Cómo te hizo sentir este momento?',
        '¿Hay algo que quieras hacer diferente la próxima vez?',
      ]);
    }
    return result.toSet().toList();
  }

  void _save() {
    final text = _note.text.trim();
    if (text.isEmpty) return;
    final details = <String, String>{};
    for (final item in _answers.entries) {
      if (item.value.text.trim().isNotEmpty) {
        details[item.key] = item.value.text.trim();
      }
    }
    widget.onSaved(
      MemoryEntry(
        id: const Uuid().v4(),
        text: text,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        details: details,
        tags: _pendingAnalysis?.topics.isNotEmpty == true
            ? _pendingAnalysis!.topics
            : _tagsFor(text),
        analysis: _pendingAnalysis,
      ),
    );
    setState(() {
      _note.clear();
      _questions = [];
      _answers.clear();
      _pendingAnalysis = null;
      _usingLocalAnalysis = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Momento guardado en tu historia')),
    );
  }

  List<String> _tagsFor(String text) {
    final lower = text.toLowerCase();
    final tags = <String>[];
    if (lower.contains('trabaj')) tags.add('trabajo');
    if (lower.contains('gimnasio') || lower.contains('entren')) {
      tags.add('bienestar');
    }
    if (lower.contains('uber') || lower.contains('pesos')) tags.add('gastos');
    if (lower.contains('habl') || lower.contains('persona')) {
      tags.add('personas');
    }
    return tags.isEmpty ? ['personal'] : tags;
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
      children: [
        Row(
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Nexo',
                    style: TextStyle(
                      fontSize: 28,
                      height: 1,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1,
                    ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Tu memoria, conectada.',
                    style: TextStyle(color: Color(0xFF77736C)),
                  ),
                ],
              ),
            ),
            PlanSwitch(mode: widget.mode, onChanged: widget.onModeChanged),
          ],
        ),
        const SizedBox(height: 30),
        Text(
          _greeting(),
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.6,
          ),
        ),
        const SizedBox(height: 7),
        const Text(
          '¿Cómo quieres guardar este momento?',
          style: TextStyle(color: Color(0xFF77736C), height: 1.4),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: _InputModeCard(
                icon: Icons.keyboard_rounded,
                title: 'Escribir',
                subtitle: 'Cuéntalo con texto',
                selected: !_voiceMode,
                onTap: () {
                  if (_listening) _stopListening();
                  setState(() => _voiceMode = false);
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _InputModeCard(
                icon: Icons.mic_rounded,
                title: 'Hablar',
                subtitle: 'Graba tu voz',
                selected: _voiceMode,
                onTap: () => setState(() => _voiceMode = true),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFE4E1DB)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0D211E18),
                blurRadius: 22,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            children: [
              if (!_voiceMode)
                TextField(
                  key: const Key('memory_input'),
                  controller: _note,
                  minLines: 5,
                  maxLines: 10,
                  decoration: const InputDecoration(
                    hintText: '¿Qué pasó hoy?',
                    filled: false,
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                  ),
                )
              else
                SizedBox(
                  height: 148,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton.filled(
                        iconSize: 34,
                        padding: const EdgeInsets.all(18),
                        onPressed: _toggleListening,
                        icon: Icon(
                          _preparingVoice
                              ? Icons.hourglass_top_rounded
                              : _listening
                              ? Icons.stop_rounded
                              : Icons.mic_rounded,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _preparingVoice
                            ? 'Preparando micrófono…'
                            : _listening
                            ? 'Escuchando… toca para terminar'
                            : _note.text.isEmpty
                            ? 'Toca para comenzar a hablar'
                            : 'Transcripción lista para revisar',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      if (_listening)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            _recordingTime,
                            style: const TextStyle(color: Color(0xFF77736C)),
                          ),
                        ),
                    ],
                  ),
                ),
              if (_voiceMode && _voiceError != null)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFE9E6),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _voiceError!,
                    style: const TextStyle(
                      color: Color(0xFF8C3027),
                      fontSize: 12,
                    ),
                  ),
                ),
              if (_voiceMode && _note.text.isNotEmpty && !_listening) ...[
                TextField(
                  controller: _note,
                  minLines: 3,
                  maxLines: 8,
                  decoration: const InputDecoration(
                    labelText: 'Revisa la transcripción',
                    hintText: 'Corrige cualquier palabra antes de continuar.',
                  ),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: _cancelListening,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Descartar y grabar de nuevo'),
                  ),
                ),
              ],
              const Divider(),
              Row(
                children: [
                  Text(
                    _voiceMode ? 'Entrada por voz' : 'Entrada por texto',
                    style: const TextStyle(
                      color: Color(0xFF77736C),
                      fontSize: 12,
                    ),
                  ),
                  const Spacer(),
                  FilledButton.icon(
                    key: const Key('analyze_button'),
                    onPressed: _analyzing ? null : _analyze,
                    icon: _analyzing
                        ? const SizedBox(
                            width: 17,
                            height: 17,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.auto_awesome, size: 18),
                    label: Text(_analyzing ? 'Analizando…' : 'Continuar'),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (_questions.isNotEmpty) ...[
          const SizedBox(height: 26),
          if (_usingLocalAnalysis)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF4D8),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.offline_bolt_outlined,
                    color: Color(0xFF89621C),
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Usando análisis local. Tu nota se guardará aunque la IA no esté disponible.',
                      style: TextStyle(
                        color: Color(0xFF6E4E15),
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Antes de guardarlo…',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
                ),
              ),
              Text(
                '${_questions.length} preguntas',
                style: const TextStyle(
                  color: Color(0xFF6656D9),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._questions.map(
            (question) => Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE4E1DB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 25,
                        height: 25,
                        decoration: const BoxDecoration(
                          color: Color(0xFFECE9FF),
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: const Icon(
                          Icons.question_mark_rounded,
                          size: 15,
                          color: Color(0xFF6656D9),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          question,
                          style: const TextStyle(
                            fontSize: 15,
                            height: 1.4,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _answers[question],
                    decoration: const InputDecoration(
                      hintText: 'Escribe tu respuesta…',
                    ),
                    minLines: 2,
                    maxLines: 6,
                  ),
                ],
              ),
            ),
          ),
          FilledButton.icon(
            key: const Key('save_memory_button'),
            onPressed: _save,
            icon: const Icon(Icons.check_rounded),
            label: const Text('Guardar en mi historia'),
          ),
          if (widget.mode == PlanMode.free)
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Text(
                'Free incluye hasta 3 preguntas por nota.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF77736C), fontSize: 12),
              ),
            ),
        ],
        if (_questions.isEmpty && widget.entries.isNotEmpty) ...[
          const SizedBox(height: 28),
          const Text(
            'Último momento',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          MemoryCard(entry: widget.entries.first),
        ],
      ],
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }
}

class TimelineView extends StatefulWidget {
  const TimelineView({
    required this.entries,
    required this.onUpdated,
    required this.onDeleted,
    super.key,
  });
  final List<MemoryEntry> entries;
  final ValueChanged<MemoryEntry> onUpdated;
  final ValueChanged<String> onDeleted;

  @override
  State<TimelineView> createState() => _TimelineViewState();
}

class _TimelineViewState extends State<TimelineView> {
  final TextEditingController _search = TextEditingController();
  String? _filter;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<String> get _filters {
    final values = <String>{};
    for (final entry in widget.entries) {
      values.addAll(entry.tags.map((value) => '#$value'));
      values.addAll(
        entry.analysis?.people.map((value) => '@$value') ?? const [],
      );
      values.addAll(
        entry.analysis?.places.map((value) => '⌖ $value') ?? const [],
      );
      values.addAll(
        entry.analysis?.emotions.map((value) => '♡ $value') ?? const [],
      );
    }
    return values.take(16).toList();
  }

  List<MemoryEntry> get _visibleEntries {
    final query = _search.text.trim().toLowerCase();
    return widget.entries.where((entry) {
      final analysis = entry.analysis;
      final content = [
        entry.text,
        ...entry.tags,
        ...entry.details.keys,
        ...entry.details.values,
        analysis?.summary ?? '',
        ...?analysis?.people,
        ...?analysis?.places,
        ...?analysis?.topics,
        ...?analysis?.emotions,
        ...?analysis?.events.expand(
          (event) => [event.title, event.description],
        ),
      ].join(' ').toLowerCase();
      if (query.isNotEmpty && !content.contains(query)) return false;
      if (_filter == null) return true;
      final selected = _filter!
          .replaceFirst(RegExp(r'^[#@]'), '')
          .replaceFirst('⌖ ', '')
          .replaceFirst('♡ ', '')
          .toLowerCase();
      return content.split(' ').join(' ').contains(selected);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visibleEntries;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const PageTitle(
          title: 'Línea del tiempo',
          subtitle: 'Busca y recorre los momentos de tu historia.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
          child: TextField(
            controller: _search,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Buscar personas, lugares, temas…',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _search.text.isEmpty
                  ? null
                  : IconButton(
                      onPressed: () {
                        _search.clear();
                        setState(() {});
                      },
                      icon: const Icon(Icons.close_rounded),
                    ),
            ),
          ),
        ),
        if (_filters.isNotEmpty)
          SizedBox(
            height: 42,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: [
                ChoiceChip(
                  label: const Text('Todo'),
                  selected: _filter == null,
                  onSelected: (_) => setState(() => _filter = null),
                ),
                const SizedBox(width: 8),
                ..._filters.map(
                  (filter) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(filter),
                      selected: _filter == filter,
                      onSelected: (_) => setState(
                        () => _filter = _filter == filter ? null : filter,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 12),
        Expanded(
          child: widget.entries.isEmpty
              ? const EmptyState(
                  icon: Icons.view_timeline_outlined,
                  title: 'Tu línea del tiempo empieza hoy',
                  message:
                      'Anota un momento y aparecerá aquí con todo su contexto.',
                )
              : visible.isEmpty
              ? const EmptyState(
                  icon: Icons.search_off_rounded,
                  title: 'No encontramos momentos',
                  message:
                      'Prueba otra búsqueda o elimina alguno de los filtros.',
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                  children: _timelineChildren(visible),
                ),
        ),
      ],
    );
  }

  List<Widget> _timelineChildren(List<MemoryEntry> entries) {
    final children = <Widget>[];
    String? previousDay;
    for (var index = 0; index < entries.length; index++) {
      final entry = entries[index];
      final day = _dayKey(entry.createdAt);
      if (day != previousDay) {
        if (children.isNotEmpty) children.add(const SizedBox(height: 22));
        children.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              _dayLabel(entry.createdAt),
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
            ),
          ),
        );
        previousDay = day;
      }
      children.add(
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: const BoxDecoration(
                    color: Color(0xFF6656D9),
                    shape: BoxShape.circle,
                  ),
                ),
                Container(
                  width: 2,
                  height: entry.analysis?.events.isNotEmpty == true ? 190 : 130,
                  color: const Color(0xFFDCD7F7),
                ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: MemoryCard(
                  entry: entry,
                  onTap: () => _openEntry(
                    context,
                    entry,
                    widget.onUpdated,
                    widget.onDeleted,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }
    return children;
  }

  String _dayKey(DateTime date) => '${date.year}-${date.month}-${date.day}';

  String _dayLabel(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final value = DateTime(date.year, date.month, date.day);
    final difference = today.difference(value).inDays;
    if (difference == 0) return 'Hoy';
    if (difference == 1) return 'Ayer';
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return '${date.day} de ${months[date.month - 1]} de ${date.year}';
  }

  Future<void> _openEntry(
    BuildContext context,
    MemoryEntry entry,
    ValueChanged<MemoryEntry> onUpdated,
    ValueChanged<String> onDeleted,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF8F7F3),
      builder: (sheetContext) => MemoryDetailSheet(
        entry: entry,
        onUpdated: (updated) {
          onUpdated(updated);
          Navigator.pop(sheetContext);
        },
        onDeleted: () {
          onDeleted(entry.id);
          Navigator.pop(sheetContext);
        },
      ),
    );
  }
}

class _InputModeCard extends StatelessWidget {
  const _InputModeCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFECE9FF) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? const Color(0xFF6656D9) : const Color(0xFFE4E1DB),
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: const Color(0xFF6656D9)),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(color: Color(0xFF77736C), fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

class LegacyConnectionsView extends StatelessWidget {
  const LegacyConnectionsView({required this.entries, super.key});
  final List<MemoryEntry> entries;

  @override
  Widget build(BuildContext context) {
    final tags = <String, int>{};
    for (final entry in entries) {
      for (final tag in entry.tags) {
        tags[tag] = (tags[tag] ?? 0) + 1;
      }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const PageTitle(
          title: 'Conexiones',
          subtitle: 'Temas y patrones que se repiten en tu vida.',
        ),
        Expanded(
          child: tags.isEmpty
              ? const EmptyState(
                  icon: Icons.hub_outlined,
                  title: 'Aún no hay conexiones',
                  message:
                      'Cuando guardes varias notas, Nexo relacionará personas, hábitos, lugares y temas.',
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                  children: [
                    Container(
                      height: 290,
                      decoration: BoxDecoration(
                        color: const Color(0xFF211F2C),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: CustomPaint(
                        painter: _KnowledgeGraphPainter(tags.keys.toList()),
                        child: const SizedBox.expand(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Toca un nodo para explorar sus notas relacionadas.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF77736C), fontSize: 12),
                    ),
                    const SizedBox(height: 22),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: tags.entries
                          .map(
                            (tag) => Container(
                              width: 148,
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: const Color(0xFFE4E1DB),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(
                                    Icons.bubble_chart_rounded,
                                    color: Color(0xFF6656D9),
                                  ),
                                  const SizedBox(height: 18),
                                  Text(
                                    '#${tag.key}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  Text(
                                    '${tag.value} ${tag.value == 1 ? 'nota' : 'notas'}',
                                    style: const TextStyle(
                                      color: Color(0xFF77736C),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF211F2C),
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.auto_awesome, color: Color(0xFFC7BEFF)),
                          SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              'Con más recuerdos podré mostrarte patrones, contexto y recomendaciones personales.',
                              style: TextStyle(
                                color: Colors.white,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }
}

class LegacySummaryView extends StatelessWidget {
  const LegacySummaryView({required this.entries, super.key});
  final List<MemoryEntry> entries;

  @override
  Widget build(BuildContext context) {
    final allTags = entries.expand((entry) => entry.tags).toList();
    final mainTopic = allTags.isEmpty
        ? null
        : allTags
              .fold<Map<String, int>>({}, (counts, tag) {
                counts[tag] = (counts[tag] ?? 0) + 1;
                return counts;
              })
              .entries
              .reduce((a, b) => a.value >= b.value ? a : b)
              .key;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
      children: [
        const Text(
          'Resumen',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 5),
        const Text(
          'Ideas útiles a partir de lo que has contado.',
          style: TextStyle(color: Color(0xFF77736C)),
        ),
        const SizedBox(height: 24),
        if (entries.isEmpty)
          const SizedBox(
            height: 450,
            child: EmptyState(
              icon: Icons.auto_awesome_outlined,
              title: 'Todavía estoy aprendiendo de ti',
              message:
                  'Guarda algunos momentos y aquí aparecerán resúmenes, patrones y recomendaciones.',
            ),
          )
        else ...[
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: const Color(0xFF211F2C),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.auto_awesome, color: Color(0xFFC7BEFF)),
                const SizedBox(height: 28),
                const Text(
                  'Tu semana en pocas palabras',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Registraste ${entries.length} ${entries.length == 1 ? 'momento' : 'momentos'}. '
                  '${mainTopic == null ? '' : 'El tema que más aparece es $mainTopic.'}',
                  style: const TextStyle(
                    color: Color(0xFFD8D5E2),
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Para ti',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          _InsightCard(
            icon: Icons.question_answer_outlined,
            title: 'Completa el contexto',
            text:
                'Revisa tus subnotas pendientes. Los pequeños detalles ayudan a encontrar patrones más precisos.',
          ),
          const SizedBox(height: 12),
          _InsightCard(
            icon: Icons.repeat_rounded,
            title: 'Observa lo que se repite',
            text: mainTopic == null
                ? 'Continúa escribiendo para descubrir hábitos recurrentes.'
                : '“$mainTopic” aparece con frecuencia. ¿Qué efecto tiene en tus días?',
          ),
        ],
      ],
    );
  }
}

class _InsightCard extends StatelessWidget {
  const _InsightCard({
    required this.icon,
    required this.title,
    required this.text,
  });
  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4E1DB)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: const Color(0xFF6656D9)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 5),
                Text(
                  text,
                  style: const TextStyle(color: Color(0xFF77736C), height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _KnowledgeGraphPainter extends CustomPainter {
  _KnowledgeGraphPainter(this.tags);
  final List<String> tags;

  @override
  void paint(Canvas canvas, Size size) {
    final points = <Offset>[
      Offset(size.width * .5, size.height * .48),
      Offset(size.width * .22, size.height * .25),
      Offset(size.width * .78, size.height * .22),
      Offset(size.width * .2, size.height * .72),
      Offset(size.width * .76, size.height * .72),
    ];
    final line = Paint()
      ..color = const Color(0xFF696275)
      ..strokeWidth = 1.2;
    for (var index = 1; index < points.length; index++) {
      canvas.drawLine(points.first, points[index], line);
    }
    final labels = ['Tú', ...tags.take(4)];
    for (var index = 0; index < labels.length; index++) {
      final point = points[index];
      canvas.drawCircle(
        point,
        index == 0 ? 29 : 22,
        Paint()
          ..color = index == 0
              ? const Color(0xFF8879F2)
              : const Color(0xFF494355),
      );
      final text = TextPainter(
        text: TextSpan(
          text: index == 0 ? labels[index] : '#${labels[index]}',
          style: TextStyle(
            color: Colors.white,
            fontSize: index == 0 ? 12 : 10,
            fontWeight: FontWeight.w700,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout(maxWidth: 80);
      text.paint(
        canvas,
        Offset(point.dx - text.width / 2, point.dy - text.height / 2),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _KnowledgeGraphPainter oldDelegate) =>
      oldDelegate.tags.join() != tags.join();
}

class SettingsView extends StatelessWidget {
  const SettingsView({
    required this.mode,
    required this.onModeChanged,
    super.key,
  });
  final PlanMode mode;
  final ValueChanged<PlanMode> onModeChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
      children: [
        const Text(
          'Ajustes',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 28),
        const Text(
          'Plan de prueba',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 6),
        const Text(
          'Por ahora puedes cambiar libremente para probar ambos flujos.',
          style: TextStyle(color: Color(0xFF77736C)),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFE4E1DB)),
          ),
          child: RadioGroup<PlanMode>(
            groupValue: mode,
            onChanged: (value) {
              if (value != null) onModeChanged(value);
            },
            child: const Column(
              children: [
                RadioListTile<PlanMode>(
                  value: PlanMode.free,
                  title: Text('Free'),
                  subtitle: Text('Hasta 3 preguntas de seguimiento'),
                ),
                Divider(),
                RadioListTile<PlanMode>(
                  value: PlanMode.premium,
                  title: Text('Premium'),
                  subtitle: Text('Seguimiento sin límite'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Privacidad',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 6),
        const Text(
          'Controla cuándo y cómo se protegen tus recuerdos.',
          style: TextStyle(color: Color(0xFF77736C)),
        ),
        const SizedBox(height: 14),
        const _SecuritySettingsCard(),
        const SizedBox(height: 18),
        const ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(Icons.lock_outline),
          title: Text('Privacidad primero'),
          subtitle: Text(
            'Tus notas se procesarán y almacenarán de forma segura.',
          ),
        ),
      ],
    );
  }
}

class _SecuritySettingsCard extends StatelessWidget {
  const _SecuritySettingsCard();

  @override
  Widget build(BuildContext context) {
    final controller = MemorySecurityScope.maybeOf(context);
    if (controller == null) return const SizedBox.shrink();
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) => Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFE4E1DB)),
        ),
        child: Column(
          children: [
            SwitchListTile(
              secondary: const Icon(Icons.pin_outlined),
              title: const Text('PIN de acceso'),
              subtitle: Text(
                controller.settings.pinEnabled
                    ? 'PIN configurado'
                    : 'Usa cuatro números',
              ),
              value: controller.settings.pinEnabled,
              onChanged: controller.authenticating
                  ? null
                  : (enabled) => enabled
                  ? _configurePin(context, controller)
                  : _confirmDisablePin(context, controller),
            ),
            const Divider(height: 1),
            SwitchListTile(
              secondary: const Icon(Icons.fingerprint_rounded),
              title: const Text('Huella o Face ID'),
              subtitle: Text(
                controller.biometricsAvailable
                    ? 'Usa la seguridad del dispositivo'
                    : 'No disponible en este dispositivo',
              ),
              value: controller.settings.biometricsEnabled,
              onChanged:
                  !controller.biometricsAvailable || controller.authenticating
                  ? null
                  : (enabled) {
                      if (enabled) {
                        controller.enableBiometrics();
                      } else {
                        controller.disableBiometrics();
                      }
                    },
            ),
            const Divider(height: 1),
            SwitchListTile(
              secondary: const Icon(Icons.screen_lock_portrait_outlined),
              title: const Text('Bloquear al salir'),
              subtitle: const Text(
                'Se activa al volver de otra aplicación',
              ),
              value: controller.settings.lockOnExit,
              onChanged: (enabled) => controller.setLockOnExit(enabled),
            ),
            if (controller.settings.pinEnabled ||
                controller.settings.biometricsEnabled) ...[
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.lock_clock_outlined),
                title: const Text('Bloquear ahora'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: controller.lock,
              ),
            ],
            if (controller.message != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                child: Text(
                  controller.message!,
                  style: const TextStyle(
                    color: Color(0xFF9E3535),
                    fontSize: 12,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _configurePin(
    BuildContext context,
    MemorySecurityController controller,
  ) async {
    final first = await _requestPin(context, 'Crea un PIN');
    if (first == null || !context.mounted) return;
    final confirmation = await _requestPin(context, 'Confirma tu PIN');
    if (confirmation == null || !context.mounted) return;
    if (first != confirmation) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Los PIN no coinciden.')),
      );
      return;
    }
    await controller.setPin(first);
  }

  Future<String?> _requestPin(BuildContext context, String title) async {
    final input = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: input,
          autofocus: true,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 4,
          decoration: const InputDecoration(hintText: '••••'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              if (RegExp(r'^\d{4}$').hasMatch(input.text)) {
                Navigator.pop(dialogContext, input.text);
              }
            },
            child: const Text('Continuar'),
          ),
        ],
      ),
    );
    input.dispose();
    return result;
  }

  Future<void> _confirmDisablePin(
    BuildContext context,
    MemorySecurityController controller,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('¿Desactivar PIN?'),
        content: const Text(
          'La biometría seguirá disponible si está activada.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Desactivar'),
          ),
        ],
      ),
    );
    if (confirmed == true) await controller.disablePin();
  }
}

class PlanSwitch extends StatelessWidget {
  const PlanSwitch({required this.mode, required this.onChanged, super.key});
  final PlanMode mode;
  final ValueChanged<PlanMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<PlanMode>(
      segments: const [
        ButtonSegment(value: PlanMode.free, label: Text('Free')),
        ButtonSegment(value: PlanMode.premium, label: Text('Pro')),
      ],
      selected: {mode},
      onSelectionChanged: (value) => onChanged(value.first),
      showSelectedIcon: false,
      style: const ButtonStyle(
        visualDensity: VisualDensity(horizontal: -3, vertical: -2),
      ),
    );
  }
}

class MemoryCard extends StatelessWidget {
  const MemoryCard({required this.entry, this.onTap, super.key});
  final MemoryEntry entry;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE4E1DB)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _time(entry.createdAt),
              style: const TextStyle(
                color: Color(0xFF6656D9),
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              entry.analysis?.summary.isNotEmpty == true
                  ? entry.analysis!.summary
                  : entry.text,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
            if (entry.analysis?.events.isNotEmpty == true) ...[
              const SizedBox(height: 12),
              ...entry.analysis!.events.take(3).map(
                (event) => Padding(
                  padding: const EdgeInsets.only(bottom: 5),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 6),
                        child: Icon(
                          Icons.circle,
                          size: 6,
                          color: Color(0xFF6656D9),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          event.title,
                          style: const TextStyle(
                            color: Color(0xFF5F5B54),
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (entry.details.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                '${entry.details.length} subnotas',
                style: const TextStyle(
                  color: Color(0xFF77736C),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            if (entry.analysis?.expenses.isNotEmpty == true) ...[
              const SizedBox(height: 8),
              Text(
                '${entry.analysis!.expenses.length} ${entry.analysis!.expenses.length == 1 ? 'gasto detectado' : 'gastos detectados'}',
                style: const TextStyle(
                  color: Color(0xFF2F765A),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: entry.tags
                  .map(
                    (tag) => Chip(
                      label: Text('#$tag'),
                      visualDensity: VisualDensity.compact,
                      side: BorderSide.none,
                      backgroundColor: const Color(0xFFF0EEFC),
                      labelStyle: const TextStyle(
                        color: Color(0xFF5445BD),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }

  String _time(DateTime value) =>
      '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')} · ${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
}

class MemoryDetailSheet extends StatefulWidget {
  const MemoryDetailSheet({
    required this.entry,
    required this.onUpdated,
    required this.onDeleted,
    super.key,
  });
  final MemoryEntry entry;
  final ValueChanged<MemoryEntry> onUpdated;
  final VoidCallback onDeleted;

  @override
  State<MemoryDetailSheet> createState() => _MemoryDetailSheetState();
}

class _MemoryDetailSheetState extends State<MemoryDetailSheet> {
  late final TextEditingController _text;
  bool _editing = false;

  @override
  void initState() {
    super.initState();
    _text = TextEditingController(text: widget.entry.text);
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: .82,
      minChildSize: .55,
      maxChildSize: .95,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(22, 12, 22, 36),
        children: [
          Center(
            child: Container(
              width: 42,
              height: 5,
              decoration: BoxDecoration(
                color: const Color(0xFFD5D1CA),
                borderRadius: BorderRadius.circular(9),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Momento',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
                ),
              ),
              IconButton(
                tooltip: 'Editar',
                onPressed: () => setState(() => _editing = !_editing),
                icon: Icon(_editing ? Icons.close : Icons.edit_outlined),
              ),
              IconButton(
                tooltip: 'Eliminar',
                onPressed: _confirmDelete,
                icon: const Icon(
                  Icons.delete_outline,
                  color: Color(0xFF9E3535),
                ),
              ),
            ],
          ),
          Row(
            children: [
              Expanded(
                child: Text(
                  _fullDate(widget.entry.createdAt),
                  style: const TextStyle(color: Color(0xFF77736C)),
                ),
              ),
              TextButton.icon(
                onPressed: _changeDate,
                icon: const Icon(Icons.calendar_today_outlined, size: 16),
                label: const Text('Cambiar fecha'),
              ),
            ],
          ),
          const SizedBox(height: 22),
          if (_editing) ...[
            TextField(controller: _text, minLines: 5, maxLines: 12),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () {
                final value = _text.text.trim();
                if (value.isEmpty) return;
                widget.onUpdated(
                  widget.entry.copyWith(text: value, updatedAt: DateTime.now()),
                );
              },
              child: const Text('Guardar cambios'),
            ),
          ] else
            Text(
              widget.entry.text,
              style: const TextStyle(fontSize: 17, height: 1.5),
            ),
          if (!_editing && widget.entry.analysis != null) ...[
            const SizedBox(height: 26),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFECE9FF),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(
                        Icons.auto_awesome,
                        color: Color(0xFF6656D9),
                        size: 19,
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Resumen de Nexo',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    widget.entry.analysis!.summary,
                    style: const TextStyle(height: 1.4),
                  ),
                ],
              ),
            ),
            if (widget.entry.analysis!.events.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text(
                'Eventos detectados',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              ...widget.entry.analysis!.events.map(
                (event) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFECE9FF),
                    child: Icon(
                      Icons.circle,
                      size: 9,
                      color: Color(0xFF6656D9),
                    ),
                  ),
                  title: Text(event.title),
                  subtitle: event.description.isEmpty
                      ? null
                      : Text(event.description),
                ),
              ),
            ],
            if (widget.entry.analysis!.expenses.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text(
                'Gastos detectados',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              ...widget.entry.analysis!.expenses.map(
                (expense) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF6F0),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.payments_outlined,
                        color: Color(0xFF2F765A),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          expense.description,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      Text(
                        expense.amount == null
                            ? expense.currency
                            : '\$${expense.amount!.toStringAsFixed(expense.amount! % 1 == 0 ? 0 : 2)} ${expense.currency}',
                        style: const TextStyle(
                          color: Color(0xFF2F765A),
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (widget.entry.analysis!.people.isNotEmpty ||
                widget.entry.analysis!.places.isNotEmpty ||
                widget.entry.analysis!.emotions.isNotEmpty) ...[
              const SizedBox(height: 18),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ...widget.entry.analysis!.people.map(
                    (person) => Chip(
                      avatar: const Icon(Icons.person_outline, size: 16),
                      label: Text(person),
                    ),
                  ),
                  ...widget.entry.analysis!.places.map(
                    (place) => Chip(
                      avatar: const Icon(Icons.place_outlined, size: 16),
                      label: Text(place),
                    ),
                  ),
                  ...widget.entry.analysis!.emotions.map(
                    (emotion) => Chip(
                      avatar: const Icon(
                        Icons.sentiment_satisfied_alt,
                        size: 16,
                      ),
                      label: Text(emotion),
                    ),
                  ),
                ],
              ),
            ],
          ],
          if (widget.entry.details.isNotEmpty) ...[
            const SizedBox(height: 28),
            const Text(
              'Subnotas',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            ...widget.entry.details.entries.map(
              (detail) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE4E1DB)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      detail.key,
                      style: const TextStyle(
                        color: Color(0xFF6656D9),
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(detail.value),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 22),
          Wrap(
            spacing: 8,
            children: widget.entry.tags
                .map((tag) => Chip(label: Text('#$tag')))
                .toList(),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('¿Eliminar este momento?'),
        content: const Text(
          'La nota y todas sus subnotas se eliminarán del dispositivo.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed == true) widget.onDeleted();
  }

  Future<void> _changeDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: widget.entry.createdAt,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(widget.entry.createdAt),
    );
    if (time == null) return;
    widget.onUpdated(
      widget.entry.copyWith(
        createdAt: DateTime(
          date.year,
          date.month,
          date.day,
          time.hour,
          time.minute,
        ),
        updatedAt: DateTime.now(),
      ),
    );
  }

  String _fullDate(DateTime value) {
    return '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')}/${value.year} · '
        '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
  }
}

class PageTitle extends StatelessWidget {
  const PageTitle({required this.title, required this.subtitle, super.key});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 5),
          Text(subtitle, style: const TextStyle(color: Color(0xFF77736C))),
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    required this.icon,
    required this.title,
    required this.message,
    super.key,
  });
  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(38),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Color(0xFFECE9FF),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 36, color: const Color(0xFF6656D9)),
            ),
            const SizedBox(height: 22),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF77736C), height: 1.45),
            ),
          ],
        ),
      ),
    );
  }
}
