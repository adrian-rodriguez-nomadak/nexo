import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import 'app_bottom_sheet.dart';
import 'module_badge.dart';

class AppDetailSheet extends StatelessWidget {
  const AppDetailSheet({
    required this.title,
    required this.children,
    this.subtitle,
    this.icon,
    this.color,
    this.primaryActionLabel,
    this.onPrimaryAction,
    this.secondaryActionLabel,
    this.onSecondaryAction,
    this.dangerActionLabel,
    this.onDangerAction,
    super.key,
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? color;
  final List<Widget> children;
  final String? primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;
  final String? dangerActionLabel;
  final VoidCallback? onDangerAction;

  static Future<T?> show<T>({
    required BuildContext context,
    required WidgetBuilder builder,
  }) {
    return AppBottomSheet.show<T>(context: context, builder: builder);
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final effectiveColor = color ?? AppColors.primaryDark;

    return AppBottomSheet(
      title: '',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ModuleBadge(
                icon: icon ?? Icons.info_outline_rounded,
                color: effectiveColor,
                size: 46,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: textTheme.headlineMedium),
                    if (subtitle != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(subtitle!, style: textTheme.bodyMedium),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          ...children,
          if (primaryActionLabel != null ||
              secondaryActionLabel != null ||
              dangerActionLabel != null) ...[
            const SizedBox(height: AppSpacing.xl),
            if (primaryActionLabel != null)
              ElevatedButton(
                onPressed: onPrimaryAction,
                child: Text(primaryActionLabel!),
              ),
            if (secondaryActionLabel != null) ...[
              const SizedBox(height: AppSpacing.md),
              OutlinedButton(
                onPressed: onSecondaryAction,
                child: Text(secondaryActionLabel!),
              ),
            ],
            if (dangerActionLabel != null) ...[
              const SizedBox(height: AppSpacing.md),
              OutlinedButton(
                onPressed: onDangerAction,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.danger,
                  side: BorderSide(
                    color: AppColors.danger.withValues(alpha: 0.35),
                  ),
                  backgroundColor: AppColors.danger.withValues(alpha: 0.06),
                ),
                child: Text(dangerActionLabel!),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
