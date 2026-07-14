class InboxAction {
  const InboxAction({
    required this.id,
    required this.rawText,
    required this.detectedIntent,
    required this.structuredPayload,
    this.userId,
    this.status = 'draft',
  });

  final String id;
  final String? userId;
  final String rawText;
  final String detectedIntent;
  final Map<String, Object?> structuredPayload;
  final String status;
}
