import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';

class AppBackButton extends StatelessWidget {
  const AppBackButton({this.fallbackLocation = '/', super.key});

  final String fallbackLocation;

  @override
  Widget build(BuildContext context) {
    return IconButton.outlined(
      onPressed: () {
        if (context.canPop()) {
          context.pop();
          return;
        }

        context.go(fallbackLocation);
      },
      icon: const Icon(Icons.arrow_back_rounded),
      color: AppColors.textPrimary,
      tooltip: 'Regresar',
    );
  }
}
