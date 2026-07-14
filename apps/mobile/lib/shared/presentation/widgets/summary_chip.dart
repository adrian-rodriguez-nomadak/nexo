import 'package:flutter/material.dart';

import '../../../core/constants/app_spacing.dart';

class SummaryChip extends StatelessWidget {
  const SummaryChip({required this.label, this.icon, this.color, super.key});

  final String label;
  final IconData? icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveColor = color ?? theme.colorScheme.primary;

    return Container(
      constraints: const BoxConstraints(minHeight: 32),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: effectiveColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: effectiveColor),
            const SizedBox(width: AppSpacing.xs),
          ],
          Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelMedium?.copyWith(
              color: effectiveColor,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
