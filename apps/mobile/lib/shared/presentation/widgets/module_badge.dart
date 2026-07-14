import 'package:flutter/material.dart';

class ModuleBadge extends StatelessWidget {
  const ModuleBadge({
    required this.icon,
    required this.color,
    this.backgroundColor,
    this.size = 44,
    super.key,
  });

  final IconData icon;
  final Color color;
  final Color? backgroundColor;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: backgroundColor ?? color.withValues(alpha: 0.14),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: color, size: size * 0.5),
    );
  }
}
