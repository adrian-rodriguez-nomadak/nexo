import 'package:flutter/material.dart';

import '../../../core/constants/app_spacing.dart';

class AppTextField extends StatelessWidget {
  const AppTextField({
    required this.label,
    this.hint,
    this.controller,
    this.keyboardType,
    this.prefixIcon,
    this.maxLines = 1,
    this.obscureText = false,
    super.key,
  });

  final String label;
  final String? hint;
  final TextEditingController? controller;
  final TextInputType? keyboardType;
  final IconData? prefixIcon;
  final int maxLines;
  final bool obscureText;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: textTheme.labelLarge),
        const SizedBox(height: AppSpacing.sm),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          obscureText: obscureText,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: prefixIcon == null ? null : Icon(prefixIcon),
          ),
        ),
      ],
    );
  }
}
