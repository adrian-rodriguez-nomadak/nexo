import '../../../../core/utils/json_read.dart';

class InterpretedAction {
  const InterpretedAction({
    required this.intent,
    required this.title,
    required this.preview,
    required this.payload,
    this.confidence = 0,
    this.source = 'local',
  });

  final String intent;
  final String title;
  final String preview;
  final Map<String, Object?> payload;
  final double confidence;
  final String source;

  factory InterpretedAction.fromJson(Map<String, dynamic> json) {
    final payload = readMap(json['payload']);
    final intent = json['intent']?.toString() ?? 'unknown';
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
    };
  }
}
