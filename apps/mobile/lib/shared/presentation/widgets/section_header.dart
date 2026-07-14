import 'package:flutter/material.dart';

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    required this.title,
    this.actionLabel,
    this.onActionTap,
    super.key,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Row(
      children: [
        Expanded(child: Text(title, style: textTheme.titleLarge)),
        if (actionLabel != null)
          TextButton(
            onPressed: onActionTap,
            style: TextButton.styleFrom(
              foregroundColor: colorScheme.primary,
              textStyle: textTheme.labelLarge,
              padding: EdgeInsets.zero,
              minimumSize: const Size(48, 36),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(actionLabel!),
          ),
      ],
    );
  }
}
