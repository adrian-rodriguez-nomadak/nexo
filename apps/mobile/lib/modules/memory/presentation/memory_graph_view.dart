import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../domain/memory_entry.dart';

class ConnectionsView extends StatefulWidget {
  const ConnectionsView({
    required this.entries,
    required this.onEntryTap,
    super.key,
  });

  final List<MemoryEntry> entries;
  final ValueChanged<MemoryEntry> onEntryTap;

  @override
  State<ConnectionsView> createState() => _ConnectionsViewState();
}

class _ConnectionsViewState extends State<ConnectionsView> {
  String _filter = 'all';
  GraphNode? _selected;

  GraphData get _graph => GraphData.fromEntries(widget.entries);

  @override
  Widget build(BuildContext context) {
    final graph = _graph;
    final visibleNodes = graph.nodes.where((node) {
      return _filter == 'all' ||
          node.type == _filter ||
          node.type == 'note';
    }).toList();
    final visibleIds = visibleNodes.map((node) => node.id).toSet();
    final visibleEdges = graph.edges
        .where(
          (edge) =>
              visibleIds.contains(edge.from) && visibleIds.contains(edge.to),
        )
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 18, 20, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Mapa',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
              ),
              SizedBox(height: 5),
              Text(
                'Explora cómo se conectan tus recuerdos.',
                style: TextStyle(color: Color(0xFF77736C)),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 42,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            children: [
              _chip('all', 'Todo'),
              _chip('note', 'Notas'),
              _chip('person', 'Personas'),
              _chip('place', 'Lugares'),
              _chip('topic', 'Temas'),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: widget.entries.isEmpty
              ? const _GraphEmpty()
              : Column(
                  children: [
                    Expanded(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 20),
                        decoration: BoxDecoration(
                          color: const Color(0xFF211F2C),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: InteractiveViewer(
                          constrained: false,
                          minScale: .55,
                          maxScale: 2.8,
                          boundaryMargin: const EdgeInsets.all(180),
                          child: _GraphCanvas(
                            nodes: visibleNodes,
                            edges: visibleEdges,
                            selected: _selected,
                            onSelected: (node) =>
                                setState(() => _selected = node),
                          ),
                        ),
                      ),
                    ),
                    if (_selected == null)
                      const Padding(
                        padding: EdgeInsets.fromLTRB(24, 12, 24, 18),
                        child: Text(
                          'Arrastra para moverte, pellizca para acercar y toca un nodo para explorarlo.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color(0xFF77736C),
                            fontSize: 12,
                          ),
                        ),
                      )
                    else
                      _NodeDetails(
                        node: _selected!,
                        entries: graph.entriesFor(_selected!),
                        reasons: graph.reasonsFor(_selected!),
                        onClose: () => setState(() => _selected = null),
                        onEntryTap: widget.onEntryTap,
                      ),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _chip(String value, String label) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: _filter == value,
        onSelected: (_) => setState(() {
          _filter = value;
          _selected = null;
        }),
      ),
    );
  }
}

class GraphData {
  GraphData(this.nodes, this.edges, this.entries);

  final List<GraphNode> nodes;
  final List<GraphEdge> edges;
  final List<MemoryEntry> entries;

  factory GraphData.fromEntries(List<MemoryEntry> entries) {
    final nodes = <String, GraphNode>{};
    final edges = <String, GraphEdge>{};
    for (final entry in entries.take(14)) {
      final noteId = 'note:${entry.id}';
      nodes[noteId] = GraphNode(
        id: noteId,
        label: _shortLabel(
          entry.analysis?.summary.isNotEmpty == true
              ? entry.analysis!.summary
              : entry.text,
        ),
        type: 'note',
        entryId: entry.id,
      );
      for (final topic in entry.tags.take(5)) {
        final id = 'topic:${topic.toLowerCase()}';
        nodes[id] = GraphNode(id: id, label: topic, type: 'topic');
        edges['$noteId|$id'] = GraphEdge(
          from: noteId,
          to: id,
          reason: 'Esta nota está conectada por el tema “$topic”.',
        );
      }
      for (final person
          in entry.analysis?.people.take(4) ?? const <String>[]) {
        final id = 'person:${person.toLowerCase()}';
        nodes[id] = GraphNode(id: id, label: person, type: 'person');
        edges['$noteId|$id'] = GraphEdge(
          from: noteId,
          to: id,
          reason: 'Esta nota menciona a $person.',
        );
      }
      for (final place
          in entry.analysis?.places.take(3) ?? const <String>[]) {
        final id = 'place:${place.toLowerCase()}';
        nodes[id] = GraphNode(id: id, label: place, type: 'place');
        edges['$noteId|$id'] = GraphEdge(
          from: noteId,
          to: id,
          reason: 'Esta nota se relaciona con el lugar $place.',
        );
      }
      for (final related
          in entry.analysis?.relatedNoteIds.take(4) ?? const <String>[]) {
        final relatedId = 'note:$related';
        edges['$noteId|$relatedId'] = GraphEdge(
          from: noteId,
          to: relatedId,
          reason: 'La IA encontró contexto compartido entre estos recuerdos.',
        );
      }
    }
    final existing = nodes.keys.toSet();
    final validEdges = edges.values
        .where(
          (edge) => existing.contains(edge.from) && existing.contains(edge.to),
        )
        .toList();
    return GraphData(nodes.values.take(32).toList(), validEdges, entries);
  }

  List<MemoryEntry> entriesFor(GraphNode node) {
    if (node.entryId != null) {
      return entries.where((entry) => entry.id == node.entryId).toList();
    }
    final value = node.label.toLowerCase();
    return entries.where((entry) {
      return entry.tags.any((tag) => tag.toLowerCase() == value) ||
          (entry.analysis?.people.any(
                (person) => person.toLowerCase() == value,
              ) ??
              false) ||
          (entry.analysis?.places.any(
                (place) => place.toLowerCase() == value,
              ) ??
              false);
    }).toList();
  }

  List<String> reasonsFor(GraphNode node) {
    return edges
        .where((edge) => edge.from == node.id || edge.to == node.id)
        .map((edge) => edge.reason)
        .toSet()
        .take(3)
        .toList();
  }

  static String _shortLabel(String value) {
    final clean = value.trim();
    return clean.length <= 26 ? clean : '${clean.substring(0, 24)}…';
  }
}

class GraphNode {
  const GraphNode({
    required this.id,
    required this.label,
    required this.type,
    this.entryId,
  });
  final String id;
  final String label;
  final String type;
  final String? entryId;
}

class GraphEdge {
  const GraphEdge({
    required this.from,
    required this.to,
    required this.reason,
  });
  final String from;
  final String to;
  final String reason;
}

class _GraphCanvas extends StatelessWidget {
  const _GraphCanvas({
    required this.nodes,
    required this.edges,
    required this.selected,
    required this.onSelected,
  });

  final List<GraphNode> nodes;
  final List<GraphEdge> edges;
  final GraphNode? selected;
  final ValueChanged<GraphNode> onSelected;

  static const size = Size(720, 720);

  @override
  Widget build(BuildContext context) {
    final positions = _positions(nodes);
    return SizedBox(
      width: size.width,
      height: size.height,
      child: Stack(
        children: [
          CustomPaint(
            size: size,
            painter: _GraphLinesPainter(
              edges: edges,
              positions: positions,
              selectedId: selected?.id,
            ),
          ),
          ...nodes.map((node) {
            final position = positions[node.id]!;
            final selectedNode = selected?.id == node.id;
            final diameter = node.type == 'note' ? 86.0 : 68.0;
            return Positioned(
              left: position.dx - diameter / 2,
              top: position.dy - diameter / 2,
              width: diameter,
              height: diameter,
              child: GestureDetector(
                onTap: () => onSelected(node),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: _nodeColor(node.type),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: selectedNode
                          ? Colors.white
                          : Colors.white.withValues(alpha: .18),
                      width: selectedNode ? 3 : 1,
                    ),
                    boxShadow: selectedNode
                        ? const [
                            BoxShadow(
                              color: Color(0x886C5CE7),
                              blurRadius: 22,
                            ),
                          ]
                        : null,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    node.label,
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: node.type == 'note' ? 10 : 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Map<String, Offset> _positions(List<GraphNode> nodes) {
    final positions = <String, Offset>{};
    if (nodes.isEmpty) return positions;
    final center = Offset(size.width / 2, size.height / 2);
    for (var index = 0; index < nodes.length; index++) {
      if (index == 0) {
        positions[nodes[index].id] = center;
        continue;
      }
      final ring = 1 + ((index - 1) ~/ 9);
      final positionInRing = (index - 1) % 9;
      final count = math.min(9, nodes.length - 1 - ((ring - 1) * 9));
      final angle = (math.pi * 2 * positionInRing / count) + ring * .35;
      final radius = 150.0 + (ring - 1) * 125;
      positions[nodes[index].id] = Offset(
        center.dx + math.cos(angle) * radius,
        center.dy + math.sin(angle) * radius,
      );
    }
    return positions;
  }

  Color _nodeColor(String type) => switch (type) {
    'person' => const Color(0xFFB05B83),
    'place' => const Color(0xFF38897D),
    'topic' => const Color(0xFFB2783D),
    _ => const Color(0xFF6656D9),
  };
}

class _GraphLinesPainter extends CustomPainter {
  _GraphLinesPainter({
    required this.edges,
    required this.positions,
    required this.selectedId,
  });
  final List<GraphEdge> edges;
  final Map<String, Offset> positions;
  final String? selectedId;

  @override
  void paint(Canvas canvas, Size size) {
    for (final edge in edges) {
      final from = positions[edge.from];
      final to = positions[edge.to];
      if (from == null || to == null) continue;
      final highlighted =
          selectedId == edge.from || selectedId == edge.to;
      canvas.drawLine(
        from,
        to,
        Paint()
          ..color = highlighted
              ? const Color(0xFFC7BEFF)
              : const Color(0xFF625C6C)
          ..strokeWidth = highlighted ? 2.4 : 1,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _GraphLinesPainter oldDelegate) => true;
}

class _NodeDetails extends StatelessWidget {
  const _NodeDetails({
    required this.node,
    required this.entries,
    required this.reasons,
    required this.onClose,
    required this.onEntryTap,
  });
  final GraphNode node;
  final List<MemoryEntry> entries;
  final List<String> reasons;
  final VoidCallback onClose;
  final ValueChanged<MemoryEntry> onEntryTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxHeight: 210),
      margin: const EdgeInsets.fromLTRB(20, 10, 20, 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4E1DB)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  node.label,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: onClose,
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
          if (reasons.isNotEmpty)
            Text(
              reasons.first,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFF77736C),
                fontSize: 12,
              ),
            ),
          const SizedBox(height: 10),
          Flexible(
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: entries.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (_, index) => ActionChip(
                avatar: const Icon(Icons.notes_rounded, size: 16),
                label: Text(
                  GraphData._shortLabel(entries[index].text),
                  maxLines: 1,
                ),
                onPressed: () => onEntryTap(entries[index]),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GraphEmpty extends StatelessWidget {
  const _GraphEmpty();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(38),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.hub_outlined, size: 44, color: Color(0xFF6656D9)),
            SizedBox(height: 18),
            Text(
              'Aún no hay conexiones',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            SizedBox(height: 8),
            Text(
              'Guarda algunos recuerdos y aparecerán aquí como un mapa.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF77736C)),
            ),
          ],
        ),
      ),
    );
  }
}
