import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../modules/settings/application/settings_providers.dart';
import '../core/utils/formatters.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

class NexoApp extends ConsumerWidget {
  const NexoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(appSettingsProvider).value;
    final themeMode = settings?.themeMode;
    configureMoneyCurrency(settings?.currency ?? 'MXN');
    return MaterialApp.router(
      title: 'Nexo',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode ?? ThemeMode.light,
      routerConfig: appRouter,
    );
  }
}
