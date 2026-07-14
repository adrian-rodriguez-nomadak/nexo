import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../modules/settings/application/settings_providers.dart';
import '../core/utils/formatters.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

class NexoApp extends ConsumerStatefulWidget {
  const NexoApp({super.key});

  @override
  ConsumerState<NexoApp> createState() => _NexoAppState();
}

class _NexoAppState extends ConsumerState<NexoApp> with WidgetsBindingObserver {
  bool _backgrounded = false;
  bool _initialLockChecked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _backgrounded = true;
      return;
    }
    if (state == AppLifecycleState.resumed && _backgrounded) {
      _backgrounded = false;
      final settings = ref.read(appSettingsProvider).value;
      if (settings?.lockOnExit == true) _openLock();
    }
  }

  void _openLock() {
    if (appRouter.routerDelegate.currentConfiguration.uri.path ==
        '/auth-lock') {
      return;
    }
    appRouter.go('/auth-lock');
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(appSettingsProvider).value;
    final themeMode = settings?.themeMode;
    configureMoneyCurrency(settings?.currency ?? 'MXN');
    if (!_initialLockChecked && settings != null) {
      _initialLockChecked = true;
      if (settings.lockOnExit) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _openLock());
      }
    }
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
