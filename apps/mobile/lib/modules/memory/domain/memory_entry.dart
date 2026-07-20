import 'memory_analysis.dart';

class MemoryEntry {
  MemoryEntry({
    required this.id,
    required this.text,
    required this.createdAt,
    required this.updatedAt,
    required this.details,
    required this.tags,
    this.analysis,
  });

  final String id;
  final String text;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Map<String, String> details;
  final List<String> tags;
  final MemoryAnalysis? analysis;

  MemoryEntry copyWith({
    String? text,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, String>? details,
    List<String>? tags,
    MemoryAnalysis? analysis,
  }) {
    return MemoryEntry(
      id: id,
      text: text ?? this.text,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      details: details ?? this.details,
      tags: tags ?? this.tags,
      analysis: analysis ?? this.analysis,
    );
  }

  Map<String, Object?> toJson() => {
    'id': id,
    'text': text,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'details': details,
    'tags': tags,
    'analysis': analysis?.toJson(),
  };

  factory MemoryEntry.fromJson(Map<String, dynamic> json) {
    final detailsJson = json['details'] as Map<String, dynamic>? ?? {};
    return MemoryEntry(
      id: json['id'] as String,
      text: json['text'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(
        (json['updatedAt'] ?? json['createdAt']) as String,
      ),
      details: detailsJson.map(
        (key, value) => MapEntry(key, value.toString()),
      ),
      tags: (json['tags'] as List<dynamic>? ?? [])
          .map((tag) => tag.toString())
          .toList(),
      analysis: json['analysis'] is Map
          ? MemoryAnalysis.fromJson(
              Map<String, dynamic>.from(json['analysis'] as Map),
            )
          : null,
    );
  }
}
