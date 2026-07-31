import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../app/theme/nexo_theme.dart';
import '../../../core/network/nexo_api.dart';

class AssistantScreen extends StatefulWidget {
  const AssistantScreen({required this.api, super.key});

  final NexoApi api;

  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final List<_ChatMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    try {
      final data = await widget.api.get('/api/assistant/messages');
      final messages = (data['messages'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(_ChatMessage.fromApi);
      if (mounted) setState(() => _messages.addAll(messages));
      _scrollToEnd();
    } catch (_) {
      // An empty conversation remains usable if history cannot be loaded.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final message = _controller.text.trim();
    if (message.isEmpty || _sending) return;
    _controller.clear();
    setState(() {
      _sending = true;
      _messages.add(_ChatMessage(role: 'user', content: message));
    });
    _scrollToEnd();
    try {
      final data = await widget.api.post(
        '/api/assistant/messages',
        body: {'message': message, 'timeZone': DateTime.now().timeZoneName},
      );
      if (!mounted) return;
      final stored = data['assistantMessage'];
      setState(() {
        _messages.add(
          stored is Map<String, dynamic>
              ? _ChatMessage.fromApi(stored)
              : _ChatMessage(
                  role: 'assistant',
                  content: data['answer']?.toString() ?? '',
                  blocks: _VisualBlock.fromList(data['blocks']),
                ),
        );
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatMessage(role: 'error', content: error.toString()));
      });
    } finally {
      if (mounted) setState(() => _sending = false);
      _scrollToEnd();
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Nexo',
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                ),
                const Icon(Icons.auto_awesome_rounded, color: NexoColors.lime),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                ? const _EmptyConversation()
                : ListView.separated(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    itemCount: _messages.length + (_sending ? 1 : 0),
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      if (index == _messages.length) {
                        return const _ThinkingBubble();
                      }
                      return _MessageBubble(message: _messages[index]);
                    },
                  ),
          ),
          _Composer(controller: _controller, enabled: !_sending, onSend: _send),
        ],
      ),
    );
  }
}

class _ChatMessage {
  const _ChatMessage({
    required this.role,
    required this.content,
    this.blocks = const [],
  });

  factory _ChatMessage.fromApi(Map<String, dynamic> value) => _ChatMessage(
    role: value['role']?.toString() ?? 'assistant',
    content: value['content']?.toString() ?? '',
    blocks: _VisualBlock.fromList(value['blocks']),
  );

  final String role;
  final String content;
  final List<_VisualBlock> blocks;
}

class _VisualBlock {
  const _VisualBlock(this.data);

  static List<_VisualBlock> fromList(dynamic value) => value is List
      ? value.whereType<Map<String, dynamic>>().map(_VisualBlock.new).toList()
      : const [];

  final Map<String, dynamic> data;
  String get type => data['type']?.toString() ?? '';
}

class _EmptyConversation extends StatelessWidget {
  const _EmptyConversation();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.forum_outlined, size: 42, color: NexoColors.lime),
            const SizedBox(height: 16),
            Text(
              '¿Qué quieres entender?',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Pregunta por tus finanzas, agenda, salud o cualquier contexto que hayas guardado.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});
  final _ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';
    final isError = message.role == 'error';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * (isUser ? .82 : .94),
        ),
        child: Column(
          crossAxisAlignment: isUser
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: isUser
                    ? NexoColors.lime.withValues(alpha: .14)
                    : isError
                    ? const Color(0xFF842D42).withValues(alpha: .25)
                    : NexoColors.surface,
                border: Border.all(
                  color: isUser
                      ? NexoColors.lime.withValues(alpha: .35)
                      : NexoColors.border,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: SelectableText(message.content),
              ),
            ),
            if (message.blocks.isNotEmpty) ...[
              const SizedBox(height: 10),
              for (final block in message.blocks) ...[
                _BlockView(block: block),
                const SizedBox(height: 10),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _ThinkingBubble extends StatelessWidget {
  const _ThinkingBubble();
  @override
  Widget build(BuildContext context) => const Align(
    alignment: Alignment.centerLeft,
    child: Padding(
      padding: EdgeInsets.all(12),
      child: SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    ),
  );
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.enabled,
    required this.onSend,
  });
  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.fromLTRB(
      16,
      10,
      16,
      MediaQuery.paddingOf(context).bottom + 10,
    ),
    decoration: const BoxDecoration(
      color: NexoColors.background,
      border: Border(top: BorderSide(color: NexoColors.border)),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: TextField(
            key: const Key('assistant-input'),
            controller: controller,
            enabled: enabled,
            minLines: 1,
            maxLines: 4,
            textInputAction: TextInputAction.newline,
            decoration: const InputDecoration(hintText: 'Escribe a Nexo…'),
          ),
        ),
        const SizedBox(width: 8),
        IconButton.filled(
          key: const Key('assistant-send'),
          onPressed: enabled ? onSend : null,
          icon: const Icon(Icons.arrow_upward_rounded),
        ),
      ],
    ),
  );
}

class _BlockView extends StatelessWidget {
  const _BlockView({required this.block});
  final _VisualBlock block;

  @override
  Widget build(BuildContext context) {
    return switch (block.type) {
      'metric_row' => _MetricsBlock(data: block.data),
      'data_table' => _TableBlock(data: block.data),
      'bar_chart' || 'line_chart' => _ChartBlock(
        data: block.data,
        line: block.type == 'line_chart',
      ),
      'progress' => _ProgressBlock(data: block.data),
      'alert' => _AlertBlock(data: block.data),
      _ => const SizedBox.shrink(),
    };
  }
}

class _VisualCard extends StatelessWidget {
  const _VisualCard({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: NexoColors.surface,
      border: Border.all(color: NexoColors.border),
      borderRadius: BorderRadius.circular(18),
    ),
    child: child,
  );
}

class _MetricsBlock extends StatelessWidget {
  const _MetricsBlock({required this.data});
  final Map<String, dynamic> data;
  @override
  Widget build(BuildContext context) {
    final items = (data['items'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .toList();
    return _VisualCard(
      child: Wrap(
        spacing: 20,
        runSpacing: 14,
        children: items
            .map(
              (item) => SizedBox(
                width: 120,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['label']?.toString() ?? '',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      item['value']?.toString() ?? '',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    if (item['detail'] != null)
                      Text(
                        item['detail'].toString(),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _TableBlock extends StatelessWidget {
  const _TableBlock({required this.data});
  final Map<String, dynamic> data;
  @override
  Widget build(BuildContext context) {
    final columns = (data['columns'] as List<dynamic>? ?? [])
        .map((item) => item.toString())
        .toList();
    final rows = (data['rows'] as List<dynamic>? ?? [])
        .whereType<List<dynamic>>();
    return _VisualCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (data['title'] != null) ...[
            Text(
              data['title'].toString(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
          ],
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columnSpacing: 22,
              columns: columns
                  .map((value) => DataColumn(label: Text(value)))
                  .toList(),
              rows: rows
                  .map(
                    (row) => DataRow(
                      cells: List.generate(
                        columns.length,
                        (index) => DataCell(
                          Text(index < row.length ? row[index].toString() : ''),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChartBlock extends StatelessWidget {
  const _ChartBlock({required this.data, required this.line});
  final Map<String, dynamic> data;
  final bool line;
  @override
  Widget build(BuildContext context) {
    final points = (data['points'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(
          (point) => _ChartPoint(
            point['label']?.toString() ?? '',
            (point['value'] as num?)?.toDouble() ?? 0,
          ),
        )
        .toList();
    return _VisualCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (data['title'] != null) ...[
            Text(
              data['title'].toString(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
          ],
          SizedBox(
            height: 180,
            child: CustomPaint(
              painter: _ChartPainter(points: points, line: line),
              child: const SizedBox.expand(),
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 4,
            children: points
                .map(
                  (point) => Text(
                    point.label,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _ChartPoint {
  const _ChartPoint(this.label, this.value);
  final String label;
  final double value;
}

class _ChartPainter extends CustomPainter {
  const _ChartPainter({required this.points, required this.line});
  final List<_ChartPoint> points;
  final bool line;
  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;
    final maxValue = math.max(
      1.0,
      points.map((point) => point.value.abs()).reduce(math.max),
    );
    final paint = Paint()
      ..color = NexoColors.lime
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    final width = size.width / points.length;
    final path = Path();
    for (var index = 0; index < points.length; index++) {
      final x = width * index + width / 2;
      final height =
          (points[index].value.abs() / maxValue) * (size.height - 12);
      final y = size.height - height;
      if (line) {
        index == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
        canvas.drawCircle(Offset(x, y), 4, paint);
      } else {
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(x - width * .28, y, width * .56, height),
            const Radius.circular(5),
          ),
          paint,
        );
      }
    }
    if (line) canvas.drawPath(path, paint..style = PaintingStyle.stroke);
  }

  @override
  bool shouldRepaint(covariant _ChartPainter oldDelegate) =>
      oldDelegate.points != points || oldDelegate.line != line;
}

class _ProgressBlock extends StatelessWidget {
  const _ProgressBlock({required this.data});
  final Map<String, dynamic> data;
  @override
  Widget build(BuildContext context) {
    final value = ((data['value'] as num?)?.toDouble() ?? 0).clamp(0.0, 1.0);
    return _VisualCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  data['label']?.toString() ?? '',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              Text(
                data['displayValue']?.toString() ?? '${(value * 100).round()}%',
              ),
            ],
          ),
          const SizedBox(height: 10),
          LinearProgressIndicator(
            value: value,
            minHeight: 8,
            borderRadius: BorderRadius.circular(8),
          ),
        ],
      ),
    );
  }
}

class _AlertBlock extends StatelessWidget {
  const _AlertBlock({required this.data});
  final Map<String, dynamic> data;
  @override
  Widget build(BuildContext context) {
    final tone = data['tone']?.toString();
    final color = tone == 'warning'
        ? Colors.amber
        : tone == 'success'
        ? NexoColors.lime
        : Theme.of(context).colorScheme.primary;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .1),
        border: Border.all(color: color.withValues(alpha: .35)),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (data['title'] != null)
            Text(
              data['title'].toString(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
          Text(data['message']?.toString() ?? ''),
        ],
      ),
    );
  }
}
