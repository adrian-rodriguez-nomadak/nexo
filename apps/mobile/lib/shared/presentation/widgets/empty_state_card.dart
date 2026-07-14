import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import 'app_card.dart';
import 'module_badge.dart';

class EmptyStateCard extends StatelessWidget {
  const EmptyStateCard({
    required this.icon,
    required this.title,
    required this.description,
    this.actionLabel,
    this.onAction,
    super.key,
  });

  final IconData icon;
  final String title;
  final String description;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ModuleBadge(icon: icon, color: AppColors.textMuted, size: 40),
          const SizedBox(height: AppSpacing.md),
          Text(title, style: textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Text(description, style: textTheme.bodySmall),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: AppSpacing.md),
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}
