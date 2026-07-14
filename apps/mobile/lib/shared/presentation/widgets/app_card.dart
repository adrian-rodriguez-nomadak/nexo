import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';

class AppCard extends StatelessWidget {
  const AppCard({
    required this.child,
    this.padding,
    this.backgroundColor,
    this.onTap,
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? backgroundColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cardTheme = theme.cardTheme;
    final shape = cardTheme.shape as RoundedRectangleBorder?;
    final borderRadius =
        shape?.borderRadius as BorderRadius? ??
        BorderRadius.circular(AppSpacing.cardRadius);

    return Material(
      color: backgroundColor ?? cardTheme.color ?? theme.colorScheme.surface,
      borderRadius: borderRadius,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: borderRadius,
        child: Container(
          width: double.infinity,
          padding: padding ?? const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            borderRadius: borderRadius,
            border: Border.all(
              color: theme.brightness == Brightness.dark
                  ? AppColors.borderDark
                  : AppColors.borderLight,
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}
