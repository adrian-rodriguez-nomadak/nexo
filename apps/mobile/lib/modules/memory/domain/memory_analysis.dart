class MemoryAnalysis {
  const MemoryAnalysis({
    required this.summary,
    required this.events,
    required this.people,
    required this.places,
    required this.topics,
    required this.emotions,
    required this.expenses,
    required this.questions,
    required this.relatedNoteIds,
    required this.source,
  });

  final String summary;
  final List<MemoryEvent> events;
  final List<String> people;
  final List<String> places;
  final List<String> topics;
  final List<String> emotions;
  final List<MemoryExpense> expenses;
  final List<String> questions;
  final List<String> relatedNoteIds;
  final String source;

  Map<String, Object?> toJson() => {
    'summary': summary,
    'events': events.map((event) => event.toJson()).toList(),
    'people': people,
    'places': places,
    'topics': topics,
    'emotions': emotions,
    'expenses': expenses.map((expense) => expense.toJson()).toList(),
    'questions': questions,
    'relatedNoteIds': relatedNoteIds,
    'source': source,
  };

  factory MemoryAnalysis.fromJson(Map<String, dynamic> json) {
    return MemoryAnalysis(
      summary: json['summary']?.toString() ?? '',
      events: _maps(json['events']).map(MemoryEvent.fromJson).toList(),
      people: _strings(json['people']),
      places: _strings(json['places']),
      topics: _strings(json['topics']),
      emotions: _strings(json['emotions']),
      expenses: _maps(
        json['expenses'],
      ).map(MemoryExpense.fromJson).toList(),
      questions: _strings(
        json['follow_up_questions'] ?? json['questions'],
      ),
      relatedNoteIds: _strings(
        json['related_note_ids'] ?? json['relatedNoteIds'],
      ),
      source: json['source']?.toString() ?? 'local',
    );
  }

  static List<String> _strings(Object? value) =>
      (value as List<dynamic>? ?? []).map((item) => item.toString()).toList();

  static List<Map<String, dynamic>> _maps(Object? value) =>
      (value as List<dynamic>? ?? [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
}

class MemoryEvent {
  const MemoryEvent({
    required this.title,
    required this.description,
    required this.occurredAt,
    required this.category,
  });
  final String title;
  final String description;
  final DateTime? occurredAt;
  final String category;

  Map<String, Object?> toJson() => {
    'title': title,
    'description': description,
    'occurred_at': occurredAt?.toIso8601String(),
    'category': category,
  };

  factory MemoryEvent.fromJson(Map<String, dynamic> json) => MemoryEvent(
    title: json['title']?.toString() ?? '',
    description: json['description']?.toString() ?? '',
    occurredAt: DateTime.tryParse(json['occurred_at']?.toString() ?? ''),
    category: json['category']?.toString() ?? 'other',
  );
}

class MemoryExpense {
  const MemoryExpense({
    required this.description,
    required this.amount,
    required this.currency,
  });
  final String description;
  final double? amount;
  final String currency;

  Map<String, Object?> toJson() => {
    'description': description,
    'amount': amount,
    'currency': currency,
  };

  factory MemoryExpense.fromJson(Map<String, dynamic> json) => MemoryExpense(
    description: json['description']?.toString() ?? '',
    amount: (json['amount'] as num?)?.toDouble(),
    currency: json['currency']?.toString() ?? 'MXN',
  );
}
