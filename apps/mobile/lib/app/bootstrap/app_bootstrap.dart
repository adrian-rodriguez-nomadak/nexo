import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/sync/sync_providers.dart';
import '../../core/notifications/notification_providers.dart';
import '../../modules/auth/application/auth_providers.dart';
import '../../modules/calendar/application/calendar_providers.dart';
import '../../modules/debts/application/debts_providers.dart';
import '../../modules/finances/application/finances_providers.dart';
import '../../modules/reminders/application/reminders_providers.dart';
import '../../modules/subscriptions/application/subscriptions_providers.dart';
import '../../modules/tasks/application/tasks_providers.dart';
import '../app.dart';

class AppBootstrap extends ConsumerStatefulWidget {
  const AppBootstrap({super.key});

  @override
  ConsumerState<AppBootstrap> createState() => _AppBootstrapState();
}

class _AppBootstrapState extends ConsumerState<AppBootstrap>
    with WidgetsBindingObserver {
  Timer? _periodicSync;
  bool _syncing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(ref.read(notificationServiceProvider).initialize());
    _periodicSync = Timer.periodic(
      const Duration(minutes: 1),
      (_) => unawaited(_runSync()),
    );
  }

  @override
  void dispose() {
    _periodicSync?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_runSync());
  }

  Future<void> _runSync() async {
    if (!mounted || _syncing || ref.read(authSessionProvider).value == null) {
      return;
    }
    _syncing = true;
    final status = ref.read(syncStatusProvider.notifier)..markSyncing();
    try {
      final result = await ref.read(syncCoordinatorProvider).run();
      status.markSuccess(result);
      _invalidateSyncedData();
    } catch (_) {
      status.markOffline();
    } finally {
      _syncing = false;
    }
  }

  void _invalidateSyncedData() {
    ref.invalidate(calendarEventsProvider);
    ref.invalidate(tasksProvider);
    ref.invalidate(remindersProvider);
    ref.invalidate(debtsProvider);
    ref.invalidate(subscriptionsProvider);
    ref.invalidate(financeSummaryProvider);
    ref.invalidate(financeMovementsProvider);
    ref.invalidate(upcomingPaymentsProvider);
    ref.invalidate(financeAccountsProvider);
    ref.invalidate(financeBudgetsProvider);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (previous, next) {
      final wasAuthenticated = previous?.value != null;
      if (!wasAuthenticated && next.value != null) unawaited(_runSync());
    });
    return const NexoApp();
  }
}
