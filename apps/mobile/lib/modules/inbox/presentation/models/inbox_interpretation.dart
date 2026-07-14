import 'package:flutter/material.dart';

class InboxInterpretation {
  const InboxInterpretation({
    required this.type,
    required this.detectedLabel,
    required this.title,
    required this.secondaryLabel,
    required this.secondary,
    required this.category,
    required this.preview,
    required this.icon,
    required this.color,
    this.confidence = 0,
    this.source = 'local',
  });

  final String type;
  final String detectedLabel;
  final String title;
  final String secondaryLabel;
  final String secondary;
  final String category;
  final String preview;
  final IconData icon;
  final Color color;
  final double confidence;
  final String source;
}
