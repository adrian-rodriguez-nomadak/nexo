import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';

class AppBottomSheet extends StatelessWidget {
  const AppBottomSheet({
    required this.title,
    required this.child,
    this.subtitle,
    this.primaryActionLabel,
    this.onPrimaryAction,
    this.secondaryActionLabel,
    this.onSecondaryAction,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget child;
  final String? primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;

  static Future<T?> show<T>({
    required BuildContext context,
    required WidgetBuilder builder,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: builder,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutCubic,
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.88,
          ),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AppSpacing.xxl),
            ),
            border: Border.all(
              color: theme.brightness == Brightness.dark
                  ? AppColors.borderDark
                  : AppColors.borderLight,
            ),
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.md,
              AppSpacing.screenPadding,
              AppSpacing.xl,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.textMuted.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (title.isNotEmpty) ...[
                  Text(title, style: textTheme.headlineMedium),
                  if (subtitle != null) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Text(subtitle!, style: textTheme.bodyMedium),
                  ],
                  const SizedBox(height: AppSpacing.xl),
                ],
                child,
                if (primaryActionLabel != null ||
                    secondaryActionLabel != null) ...[
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
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
