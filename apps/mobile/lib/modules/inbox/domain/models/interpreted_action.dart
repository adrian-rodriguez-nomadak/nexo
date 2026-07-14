import '../../../../core/utils/json_read.dart';

class InterpretedAction {
  const InterpretedAction({
    required this.intent,
    required this.title,
    required this.preview,
    required this.payload,
    this.confidence = 0,
    this.source = 'local',
    this.additionalActions = const [],
  });

  final String intent;
  final String title;
  final String preview;
  final Map<String, Object?> payload;
  final double confidence;
  final String source;
  final List<InterpretedAction> additionalActions;

  factory InterpretedAction.fromJson(Map<String, dynamic> json) {
    return _fromJson(json, includeActions: true);
  }

  static InterpretedAction _fromJson(
    Map<String, dynamic> json, {
    required bool includeActions,
  }) {
    final payload = readMap(json['payload']);
    final intent = json['intent']?.toString() ?? 'unknown';
    final rawActions = json['actions'];
    final actions = includeActions && rawActions is List
        ? rawActions
              .whereType<Map>()
              .map(
                (item) => _fromJson(
                  Map<String, dynamic>.from(item),
                  includeActions: false,
                ),
              )
              .toList()
        : const <InterpretedAction>[];
    final additional = actions.length > 1
        ? actions.skip(1).toList()
        : const <InterpretedAction>[];
    return InterpretedAction(
      intent: intent,
      title:
          json['title']?.toString() ??
          payload['title']?.toString() ??
          payload['description']?.toString() ??
          intent,
      preview: json['preview']?.toString() ?? 'Interpretación preparada.',
      payload: payload,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
      source: json['source']?.toString() ?? 'local',
      additionalActions: additional,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'intent': intent,
      'title': title,
      'preview': preview,
      'payload': payload,
      'confidence': confidence,
      'source': source,
      'actions': additionalActions.map((action) => action.toJson()).toList(),
    };
  }
}
