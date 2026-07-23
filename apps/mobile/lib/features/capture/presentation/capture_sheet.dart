import 'package:flutter/material.dart';

import '../../../app/theme/nexo_theme.dart';
import '../../modules/domain/nexo_module.dart';

class CaptureDraft {
  const CaptureDraft({
    required this.module,
    required this.text,
    required this.createdAt,
  });

  final NexoModule module;
  final String text;
  final DateTime createdAt;
}

Future<CaptureDraft?> showNexoCaptureSheet(
  BuildContext context, {
  NexoModule? initialModule,
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
    builder: (_) => _CaptureSheet(initialModule: initialModule),
  );
}

class _CaptureSheet extends StatefulWidget {
  const _CaptureSheet({this.initialModule});

  final NexoModule? initialModule;

  @override
  State<_CaptureSheet> createState() => _CaptureSheetState();
}

class _CaptureSheetState extends State<_CaptureSheet> {
  late NexoModule _selectedModule;
  final _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedModule = widget.initialModule ?? NexoModules.notes;
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
    if (text.isEmpty) return;

    Navigator.of(context).pop(
      CaptureDraft(
        module: _selectedModule,
        text: text,
        createdAt: DateTime.now(),
      ),
    );
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
            'Cuéntale algo a Nexo',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Elige dónde guardarlo. Más adelante Nexo podrá clasificarlo por ti.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: NexoModules.all.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final module = NexoModules.all[index];
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
            minLines: 4,
            maxLines: 7,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              hintText: _selectedModule.prompt,
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
            onPressed: _controller.text.trim().isEmpty ? null : _save,
            icon: const Icon(Icons.arrow_upward_rounded),
            label: const Text('Guardar captura'),
          ),
        ],
      ),
    );
  }
}
