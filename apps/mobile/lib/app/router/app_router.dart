import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../modules/auth_lock/presentation/auth_lock_screen.dart';
import '../../modules/auth/presentation/login_screen.dart';
import '../../modules/calendar/presentation/calendar_screen.dart';
import '../../modules/dashboard/presentation/dashboard_screen.dart';
import '../../modules/debts/presentation/debts_screen.dart';
import '../../modules/finances/presentation/finances_screen.dart';
import '../../modules/inbox/presentation/inbox_screen.dart';
import '../../modules/onboarding/presentation/onboarding_screen.dart';
import '../../modules/settings/presentation/settings_screen.dart';
import '../../modules/subscriptions/presentation/subscriptions_screen.dart';
import '../shell/app_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorDashboardKey = GlobalKey<NavigatorState>();
final _shellNavigatorCalendarKey = GlobalKey<NavigatorState>();
final _shellNavigatorInboxKey = GlobalKey<NavigatorState>();
final _shellNavigatorFinancesKey = GlobalKey<NavigatorState>();
final _shellNavigatorSettingsKey = GlobalKey<NavigatorState>();

final GoRouter appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return AppShell(navigationShell: navigationShell);
      },
      branches: [
        StatefulShellBranch(
          navigatorKey: _shellNavigatorDashboardKey,
          routes: [
            GoRoute(
              path: '/',
              name: 'dashboard',
              builder: (context, state) => const DashboardScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          navigatorKey: _shellNavigatorCalendarKey,
          routes: [
            GoRoute(
              path: '/calendar',
              name: 'calendar',
              builder: (context, state) => const CalendarScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          navigatorKey: _shellNavigatorInboxKey,
          routes: [
            GoRoute(
              path: '/inbox',
              name: 'inbox',
              builder: (context, state) => const InboxScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          navigatorKey: _shellNavigatorFinancesKey,
          routes: [
            GoRoute(
              path: '/finances',
              name: 'finances',
              builder: (context, state) => const FinancesScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          navigatorKey: _shellNavigatorSettingsKey,
          routes: [
            GoRoute(
              path: '/settings',
              name: 'settings',
              builder: (context, state) => const SettingsScreen(),
            ),
          ],
        ),
      ],
    ),
    GoRoute(
      parentNavigatorKey: _rootNavigatorKey,
      path: '/login',
      name: 'login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      parentNavigatorKey: _rootNavigatorKey,
      path: '/subscriptions',
      name: 'subscriptions',
      builder: (context, state) => const SubscriptionsScreen(),
    ),
    GoRoute(
      parentNavigatorKey: _rootNavigatorKey,
      path: '/debts',
      name: 'debts',
      builder: (context, state) => const DebtsScreen(),
    ),
    GoRoute(
      parentNavigatorKey: _rootNavigatorKey,
      path: '/onboarding',
      name: 'onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      parentNavigatorKey: _rootNavigatorKey,
      path: '/auth-lock',
      name: 'authLock',
      builder: (context, state) => const AuthLockScreen(),
    ),
  ],
);
