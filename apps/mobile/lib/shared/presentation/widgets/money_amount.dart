import 'package:flutter/material.dart';

import '../../../core/constants/app_spacing.dart';

enum MoneyAmountVariant { large, compact }

class MoneyAmount extends StatelessWidget {
  const MoneyAmount({
    required this.amount,
    required this.label,
    this.variant = MoneyAmountVariant.large,
    this.color,
    super.key,
  });

  final String amount;
  final String label;
  final MoneyAmountVariant variant;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final amountStyle = variant == MoneyAmountVariant.large
        ? textTheme.displayMedium
        : textTheme.titleLarge;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          amount,
          style: amountStyle?.copyWith(
            color: color ?? amountStyle.color,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(label, style: textTheme.bodySmall),
      ],
    );
  }
}
