import 'package:flutter/material.dart';

import 'router/app_router.dart';
import 'theme/app_theme.dart';

class NexoApp extends StatelessWidget {
  const NexoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Nexo',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.light,
      routerConfig: appRouter,
    );
  }
}
