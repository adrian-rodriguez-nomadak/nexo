import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/memory_analysis.dart';

class MemoryContext {
  const MemoryContext({
    this.compressedSummary = '',
    this.knownFacts = const [],
    this.recurringPatterns = const [],
  });

  final String compressedSummary;
  final List<String> knownFacts;
  final List<String> recurringPatterns;

  Map<String, Object?> toJson() => {
    'compressed_summary': compressedSummary,
    'known_facts': knownFacts,
    'recurring_patterns': recurringPatterns,
  };

  factory MemoryContext.fromJson(Map<String, dynamic> json) => MemoryContext(
    compressedSummary: json['compressed_summary']?.toString() ?? '',
    knownFacts: _strings(json['known_facts']),
    recurringPatterns: _strings(json['recurring_patterns']),
  );

  static List<String> _strings(Object? value) =>
      (value as List<dynamic>? ?? []).map((item) => item.toString()).toList();
}

class MemoryContextRepository {
  const MemoryContextRepository({
    this.storage = const FlutterSecureStorage(),
  });

  static const _key = 'nexo_compressed_memory_context_v1';
  final FlutterSecureStorage storage;

  Future<MemoryContext> load() async {
    final raw = await storage.read(key: _key);
    if (raw == null || raw.isEmpty) return const MemoryContext();
    return MemoryContext.fromJson(
      Map<String, dynamic>.from(jsonDecode(raw) as Map),
    );
  }

  Future<void> save(MemoryContextUpdate update) {
    return storage.write(
      key: _key,
      value: jsonEncode(
        MemoryContext(
          compressedSummary: update.compressedSummary,
          knownFacts: update.knownFacts,
          recurringPatterns: update.recurringPatterns,
        ).toJson(),
      ),
    );
  }
}
