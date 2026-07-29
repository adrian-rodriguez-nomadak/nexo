import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/theme/nexo_theme.dart';
import '../../modules/domain/nexo_module.dart';

class CaptureDraft {
  const CaptureDraft({
    required this.module,
    required this.text,
    required this.createdAt,
    this.imageBytes,
    this.imageName,
    this.submodule,
  });

  factory CaptureDraft.fromApi(Map<String, dynamic> json) {
    return CaptureDraft(
      module: NexoModules.byId(json['module']?.toString()) ?? NexoModules.notes,
      text: json['content']?.toString() ?? '',
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      submodule: json['submodule']?.toString(),
    );
  }

  final NexoModule module;
  final String text;
  final DateTime createdAt;
  final Uint8List? imageBytes;
  final String? imageName;
  final String? submodule;

  bool get hasImage => imageBytes != null;
}

Future<CaptureDraft?> showNexoCaptureSheet(
  BuildContext context, {
  NexoModule? initialModule,
  List<NexoModule>? allowedModules,
}) {
  return showModalBottomSheet<CaptureDraft>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: NexoColors.surface,
    barrierColor: Colors.black.withValues(alpha: 0.72),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
    ),
    builder: (_) => _CaptureSheet(
      initialModule: initialModule,
      allowedModules: allowedModules,
    ),
  );
}

class _CaptureSheet extends StatefulWidget {
  const _CaptureSheet({this.initialModule, this.allowedModules});

  final NexoModule? initialModule;
  final List<NexoModule>? allowedModules;

  @override
  State<_CaptureSheet> createState() => _CaptureSheetState();
}

class _CaptureSheetState extends State<_CaptureSheet> {
  late NexoModule _selectedModule;
  final _controller = TextEditingController();
  final _imagePicker = ImagePicker();
  Uint8List? _imageBytes;
  String? _imageName;
  bool _isPickingImage = false;

  bool get _canSave =>
      _controller.text.trim().isNotEmpty || _imageBytes != null;
  List<NexoModule> get _availableModules =>
      widget.allowedModules?.isNotEmpty == true
      ? widget.allowedModules!
      : NexoModules.all;

  @override
  void initState() {
    super.initState();
    _selectedModule =
        widget.initialModule ??
        (_availableModules.contains(NexoModules.notes)
            ? NexoModules.notes
            : _availableModules.first);
    _controller.addListener(_refresh);
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_refresh)
      ..dispose();
    super.dispose();
  }

  void _refresh() => setState(() {});

  void _save() {
    final text = _controller.text.trim();
    if (!_canSave) return;

    Navigator.of(context).pop(
      CaptureDraft(
        module: _selectedModule,
        text: text,
        createdAt: DateTime.now(),
        imageBytes: _imageBytes,
        imageName: _imageName,
      ),
    );
  }

  Future<void> _pickScreenshot() async {
    setState(() => _isPickingImage = true);
    try {
      final image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 88,
      );
      if (image == null || !mounted) return;

      final bytes = await image.readAsBytes();
      if (!mounted) return;
      setState(() {
        _imageBytes = bytes;
        _imageName = image.name;
      });
    } finally {
      if (mounted) setState(() => _isPickingImage = false);
    }
  }

  void _removeScreenshot() {
    setState(() {
      _imageBytes = null;
      _imageName = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + keyboardInset),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: NexoColors.border,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Captura algo importante',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Sube una captura de pantalla o escribe el dato manualmente.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 18),
          if (_imageBytes == null)
            OutlinedButton.icon(
              key: const Key('pick-screenshot'),
              onPressed: _isPickingImage ? null : _pickScreenshot,
              icon: _isPickingImage
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.add_photo_alternate_outlined),
              label: Text(
                _isPickingImage
                    ? 'Abriendo Fotos…'
                    : 'Seleccionar captura de pantalla',
              ),
            )
          else
            _ScreenshotPreview(
              imageBytes: _imageBytes!,
              imageName: _imageName,
              onRemove: _removeScreenshot,
            ),
          const SizedBox(height: 20),
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _availableModules.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final module = _availableModules[index];
                final selected = module.id == _selectedModule.id;

                return ChoiceChip(
                  label: Text(module.name),
                  avatar: Icon(
                    module.icon,
                    size: 17,
                    color: selected ? NexoColors.background : module.color,
                  ),
                  selected: selected,
                  selectedColor: module.color,
                  backgroundColor: NexoColors.surfaceHigh,
                  side: BorderSide(
                    color: selected ? module.color : NexoColors.border,
                  ),
                  labelStyle: TextStyle(
                    color: selected ? NexoColors.background : NexoColors.text,
                    fontWeight: FontWeight.w700,
                  ),
                  onSelected: (_) => setState(() => _selectedModule = module),
                );
              },
            ),
          ),
          const SizedBox(height: 18),
          TextField(
            key: const Key('capture-input'),
            controller: _controller,
            autofocus: true,
            minLines: 3,
            maxLines: 6,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              hintText: _imageBytes == null
                  ? _selectedModule.prompt
                  : 'Añade contexto para ayudar a Nexo (opcional)',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(
                Icons.lock_outline_rounded,
                color: NexoColors.muted,
                size: 16,
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  'Por ahora se conserva únicamente durante esta sesión.',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            key: const Key('save-capture'),
            onPressed: _canSave ? _save : null,
            icon: const Icon(Icons.arrow_upward_rounded),
            label: const Text('Guardar captura'),
          ),
        ],
      ),
    );
  }
}

class _ScreenshotPreview extends StatelessWidget {
  const _ScreenshotPreview({
    required this.imageBytes,
    required this.imageName,
    required this.onRemove,
  });

  final Uint8List imageBytes;
  final String? imageName;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('screenshot-preview'),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: NexoColors.surfaceHigh,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: NexoColors.border),
      ),
      child: Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(13),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 240),
              child: Image.memory(
                imageBytes,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(
                Icons.image_outlined,
                size: 18,
                color: NexoColors.muted,
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  imageName ?? 'Captura seleccionada',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
              IconButton(
                key: const Key('remove-screenshot'),
                onPressed: onRemove,
                tooltip: 'Quitar captura',
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
