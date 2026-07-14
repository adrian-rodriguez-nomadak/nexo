import 'package:flutter/material.dart';

import '../../../core/constants/app_spacing.dart';
import 'app_back_button.dart';

class EmptyModuleScreen extends StatelessWidget {
  const EmptyModuleScreen({
    required this.title,
    required this.subtitle,
    this.icon,
    super.key,
  });

  final String title;
  final String subtitle;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        leading: const Padding(
          padding: EdgeInsets.only(left: 8),
          child: AppBackButton(),
        ),
        title: Text(title),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Align(
            alignment: Alignment.topLeft,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: colorScheme.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    icon ?? Icons.widgets_outlined,
                    color: colorScheme.primary,
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                Text(title, style: textTheme.headlineLarge),
                const SizedBox(height: AppSpacing.sm),
                Text(subtitle, style: textTheme.bodyMedium),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
