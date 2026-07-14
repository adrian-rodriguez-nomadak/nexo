import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/database/database_provider.dart';
import '../../../core/notifications/notification_providers.dart';
import '../../../shared/presentation/widgets/app_back_button.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/section_header.dart';
import '../../../shared/presentation/widgets/summary_chip.dart';
import '../../../core/sync/sync_providers.dart';
import '../../auth/application/auth_providers.dart';
import '../../calendar/application/calendar_providers.dart';
import '../../debts/application/debts_providers.dart';
import '../../finances/application/finances_providers.dart';
import '../../reminders/application/reminders_providers.dart';
import '../../subscriptions/application/subscriptions_providers.dart';
import '../../tasks/application/tasks_providers.dart';
import '../../auth_lock/application/security_service.dart';
import '../application/settings_providers.dart';
import '../domain/app_settings.dart';
import '../data/local_data_service.dart';
import '../data/categories_service.dart';
import 'widgets/categories_sheet.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  Future<void> _update(AppSettings Function(AppSettings) change) =>
      ref.read(appSettingsProvider.notifier).persist(change);

  Future<void> _configurePin(bool enabled) async {
    final security = ref.read(securityServiceProvider);
    if (!enabled) {
      await security.clearPin();
      await _update(
        (current) => current.copyWith(
          pinEnabled: false,
          biometricsEnabled: false,
          lockOnExit: false,
        ),
      );
      return;
    }
    final pin = TextEditingController();
    final confirmation = TextEditingController();
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Crear PIN'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: pin,
              obscureText: true,
              maxLength: 4,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'PIN de 4 dígitos'),
            ),
            TextField(
              controller: confirmation,
              obscureText: true,
              maxLength: 4,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Confirmar PIN'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(
              context,
              pin.text.length == 4 && pin.text == confirmation.text,
            ),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
    if (accepted == true) {
      await security.savePin(pin.text);
      await _update((current) => current.copyWith(pinEnabled: true));
    } else if (mounted && pin.text.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Los PIN deben coincidir y tener 4 dígitos.'),
        ),
      );
    }
    pin.dispose();
    confirmation.dispose();
  }

  Future<void> _configureBiometrics(bool enabled) async {
    if (!enabled) {
      await _update((current) => current.copyWith(biometricsEnabled: false));
      return;
    }
    if (!await ref.read(securityServiceProvider).canUseBiometrics()) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Este dispositivo no tiene biometría disponible.'),
        ),
      );
      return;
    }
    await _update(
      (current) => current.copyWith(biometricsEnabled: true, lockOnExit: true),
    );
  }

  Future<bool> _ensureNotifications(bool enabled) async {
    if (!enabled) return true;
    final granted = await ref
        .read(notificationServiceProvider)
        .requestPermission();
    if (!granted && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Activa las notificaciones en los ajustes del dispositivo.',
          ),
        ),
      );
    }
    return granted;
  }

  Future<void> _setDailySummary(bool enabled, {required bool morning}) async {
    if (!await _ensureNotifications(enabled)) return;
    await ref
        .read(notificationServiceProvider)
        .scheduleDailySummary(morning: morning, enabled: enabled);
    await _update(
      (current) => morning
          ? current.copyWith(dailySummary: enabled)
          : current.copyWith(nightSummary: enabled),
    );
  }

  Future<void> _chooseSetting({
    required String title,
    required List<String> options,
    required String selected,
    required ValueChanged<String> onSelected,
  }) async {
    final value = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 4, 24, 12),
              child: Text(title, style: Theme.of(context).textTheme.titleLarge),
            ),
            for (final option in options)
              ListTile(
                title: Text(option),
                trailing: option == selected
                    ? const Icon(
                        Icons.check_circle_rounded,
                        color: AppColors.primaryDark,
                      )
                    : null,
                onTap: () => Navigator.pop(context, option),
              ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
    if (value != null) onSelected(value);
  }

  Future<void> _deleteLocalData() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Borrar datos locales?'),
        content: const Text(
          'Se eliminarán movimientos, eventos, tareas, recordatorios, deudas, suscripciones y elementos del Inbox de este dispositivo. Esta acción no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Borrar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final db = ref.read(appDatabaseProvider);
    await db.transaction(() async {
      await db.customStatement('DELETE FROM finance_accounts');
      await db.customStatement('DELETE FROM finance_budgets');
      await db.customStatement('DELETE FROM finance_categories');
      await db.delete(db.financeMovements).go();
      await db.delete(db.upcomingPayments).go();
      await db.delete(db.calendarEvents).go();
      await db.delete(db.taskItems).go();
      await db.delete(db.reminderItems).go();
      await db.delete(db.debtPayments).go();
      await db.delete(db.debts).go();
      await db.delete(db.subscriptions).go();
      await db.delete(db.inboxActions).go();
      await db.customStatement('DELETE FROM sync_queue');
      await db.customStatement('DELETE FROM sync_inbox');
      await db.customStatement('DELETE FROM sync_versions');
      await db.customStatement('DELETE FROM sync_metadata');
    });
    ref.invalidate(calendarEventsProvider);
    ref.invalidate(tasksProvider);
    ref.invalidate(remindersProvider);
    ref.invalidate(debtsProvider);
    ref.invalidate(subscriptionsProvider);
    ref.invalidate(financeSummaryProvider);
    ref.invalidate(financeMovementsProvider);
    ref.invalidate(upcomingPaymentsProvider);
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Datos locales eliminados.')));
  }

  Future<void> _showLocalData() async {
    final summary = await LocalDataService(
      ref.read(appDatabaseProvider),
    ).summary();
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${summary.total} elementos guardados'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView(
            shrinkWrap: true,
            children: [
              for (final entry in summary.counts.entries)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(entry.key),
                  trailing: Text(entry.value.toString()),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  Future<void> _exportLocalData() async {
    final backup = await LocalDataService(
      ref.read(appDatabaseProvider),
    ).exportJson();
    await Clipboard.setData(ClipboardData(text: backup));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Respaldo JSON copiado al portapapeles.')),
    );
  }

  Future<void> _syncNow() async {
    if (ref.read(authSessionProvider).value == null) {
      context.push('/login');
      return;
    }
    final status = ref.read(syncStatusProvider.notifier)..markSyncing();
    try {
      final result = await ref.read(syncCoordinatorProvider).run();
      status.markSuccess(result);
      ref.invalidate(calendarEventsProvider);
      ref.invalidate(tasksProvider);
      ref.invalidate(remindersProvider);
      ref.invalidate(debtsProvider);
      ref.invalidate(subscriptionsProvider);
      ref.invalidate(financeSummaryProvider);
      ref.invalidate(financeMovementsProvider);
      ref.invalidate(upcomingPaymentsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${result.pushed} enviados, ${result.applied} aplicados, ${result.conflicts} conflictos',
          ),
        ),
      );
    } catch (_) {
      status.markOffline();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo sincronizar. Se reintentará después.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final settings =
        ref.watch(appSettingsProvider).value ?? const AppSettings();
    final syncStatus = ref.watch(syncStatusProvider);
    final syncLabel = switch (syncStatus.phase) {
      SyncPhase.idle => 'Listo',
      SyncPhase.syncing => 'Sincronizando…',
      SyncPhase.synced => 'Actualizado',
      SyncPhase.conflict => 'Requiere revisión',
      SyncPhase.offline => 'Pendiente',
    };
    final syncIcon = switch (syncStatus.phase) {
      SyncPhase.syncing => Icons.sync_rounded,
      SyncPhase.synced => Icons.cloud_done_rounded,
      SyncPhase.conflict => Icons.warning_amber_rounded,
      SyncPhase.offline => Icons.cloud_off_rounded,
      SyncPhase.idle => Icons.sync_rounded,
    };

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.lg,
            AppSpacing.screenPadding,
            150,
          ),
          children: [
            Row(
              children: [
                const AppBackButton(),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Ajustes', style: textTheme.headlineLarge),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Personaliza seguridad, notificaciones y preferencias.',
                        style: textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const ModuleBadge(
                  icon: Icons.settings_rounded,
                  color: AppColors.primaryDark,
                  backgroundColor: AppColors.primary,
                  size: 48,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            const _ProfileCard(),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Seguridad'),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Column(
                children: [
                  _SwitchSettingTile(
                    icon: Icons.pin_rounded,
                    color: AppColors.info,
                    title: 'PIN de acceso',
                    description: 'Protege la entrada a Nexo con un código.',
                    value: settings.pinEnabled,
                    onChanged: _configurePin,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.fingerprint_rounded,
                    color: AppColors.primaryDark,
                    title: 'Huella / Face ID',
                    description: 'Acceso rápido con biometría del dispositivo.',
                    value: settings.biometricsEnabled,
                    onChanged: _configureBiometrics,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.lock_rounded,
                    color: AppColors.calendar,
                    title: 'Bloquear app al salir',
                    description: 'Vuelve a pedir acceso al regresar.',
                    value: settings.lockOnExit,
                    onChanged: (value) {
                      if (value &&
                          !settings.pinEnabled &&
                          !settings.biometricsEnabled) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Activa primero un PIN o la biometría.',
                            ),
                          ),
                        );
                        return;
                      }
                      _update((current) => current.copyWith(lockOnExit: value));
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Notificaciones'),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Column(
                children: [
                  _SwitchSettingTile(
                    icon: Icons.notifications_active_rounded,
                    color: AppColors.task,
                    title: 'Recordatorios',
                    description: 'Avisos visuales para pendientes importantes.',
                    value: settings.reminders,
                    onChanged: (value) async {
                      if (!await _ensureNotifications(value)) return;
                      await _update(
                        (current) => current.copyWith(reminders: value),
                      );
                    },
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.payments_rounded,
                    color: AppColors.subscription,
                    title: 'Pagos próximos',
                    description: 'Alertas para suscripciones, deudas y pagos.',
                    value: settings.upcomingPayments,
                    onChanged: (value) async {
                      if (!await _ensureNotifications(value)) return;
                      await _update(
                        (current) => current.copyWith(upcomingPayments: value),
                      );
                    },
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.wb_sunny_rounded,
                    color: AppColors.warning,
                    title: 'Resumen diario',
                    description: 'Una vista breve para iniciar el día.',
                    value: settings.dailySummary,
                    onChanged: (value) =>
                        _setDailySummary(value, morning: true),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.nightlight_round,
                    color: AppColors.secondary,
                    title: 'Resumen nocturno',
                    description: 'Cierre visual con pendientes y movimientos.',
                    value: settings.nightSummary,
                    onChanged: (value) =>
                        _setDailySummary(value, morning: false),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Preferencias'),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Column(
                children: [
                  _InfoSettingTile(
                    icon: Icons.savings_rounded,
                    color: AppColors.finance,
                    title: 'Presupuesto',
                    value: settings.budgetPeriod,
                    onTap: () => _chooseSetting(
                      title: 'Periodo de presupuesto',
                      options: const ['Semanal', 'Quincenal', 'Mensual'],
                      selected: settings.budgetPeriod,
                      onSelected: (value) => _update(
                        (current) => current.copyWith(budgetPeriod: value),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _InfoSettingTile(
                    icon: Icons.attach_money_rounded,
                    color: AppColors.primaryDark,
                    title: 'Moneda',
                    value: settings.currency,
                    onTap: () => _chooseSetting(
                      title: 'Moneda',
                      options: const ['MXN', 'USD', 'EUR'],
                      selected: settings.currency,
                      onSelected: (value) => _update(
                        (current) => current.copyWith(currency: value),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _InfoSettingTile(
                    icon: Icons.light_mode_rounded,
                    color: AppColors.warning,
                    title: 'Tema',
                    value: switch (settings.themeMode) {
                      ThemeMode.light => 'Claro',
                      ThemeMode.dark => 'Oscuro',
                      ThemeMode.system => 'Del sistema',
                    },
                    onTap: () {
                      final labels = {
                        'Claro': ThemeMode.light,
                        'Oscuro': ThemeMode.dark,
                        'Del sistema': ThemeMode.system,
                      };
                      _chooseSetting(
                        title: 'Tema',
                        options: labels.keys.toList(),
                        selected: labels.entries
                            .firstWhere(
                              (entry) => entry.value == settings.themeMode,
                            )
                            .key,
                        onSelected: (value) => _update(
                          (current) =>
                              current.copyWith(themeMode: labels[value]),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _InfoSettingTile(
                    icon: Icons.category_rounded,
                    color: AppColors.accent,
                    title: 'Categorías',
                    value: '',
                    chipLabel: 'Administrar',
                    chipIcon: Icons.edit_rounded,
                    onTap: () => CategoriesSheet.show(
                      context: context,
                      service: CategoriesService(ref.read(appDatabaseProvider)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Privacidad y datos'),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Column(
                children: [
                  _InfoSettingTile(
                    icon: Icons.storage_rounded,
                    color: AppColors.info,
                    title: 'Datos locales',
                    value: '',
                    chipLabel: 'Activo',
                    chipIcon: Icons.check_circle_rounded,
                    onTap: _showLocalData,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _InfoSettingTile(
                    icon: Icons.cloud_upload_rounded,
                    color: AppColors.calendar,
                    title: 'Sincronizar ahora',
                    value: '',
                    chipLabel: syncLabel,
                    chipIcon: syncIcon,
                    onTap: syncStatus.phase == SyncPhase.syncing
                        ? null
                        : _syncNow,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _InfoSettingTile(
                    icon: Icons.ios_share_rounded,
                    color: AppColors.accent,
                    title: 'Exportar información',
                    value: '',
                    chipLabel: 'Copiar JSON',
                    chipIcon: Icons.copy_all_rounded,
                    onTap: _exportLocalData,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _InfoSettingTile(
                    icon: Icons.delete_outline_rounded,
                    color: AppColors.danger,
                    title: 'Borrar datos',
                    value: '',
                    onTap: _deleteLocalData,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'IA'),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Column(
                children: [
                  _SwitchSettingTile(
                    icon: Icons.auto_awesome_rounded,
                    color: AppColors.primaryDark,
                    title: 'Inbox inteligente',
                    description: 'Sugiere tareas, pagos y eventos detectados.',
                    value: settings.smartInbox,
                    onChanged: (value) => _update(
                      (current) => current.copyWith(smartInbox: value),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.rule_rounded,
                    color: AppColors.task,
                    title: 'Confirmar antes de guardar',
                    description: 'Revisa cada sugerencia antes de aceptarla.',
                    value: settings.confirmBeforeSave,
                    onChanged: (value) => _update(
                      (current) => current.copyWith(confirmBeforeSave: value),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.summarize_rounded,
                    color: AppColors.secondary,
                    title: 'Resúmenes automáticos',
                    description: 'Prepara síntesis visuales de tu actividad.',
                    value: settings.automaticSummaries,
                    onChanged: (value) => _update(
                      (current) => current.copyWith(automaticSummaries: value),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxxl),
            const _SettingsFooter(),
          ],
        ),
      ),
    );
  }
}

class _ProfileCard extends ConsumerWidget {
  const _ProfileCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    final session = ref.watch(authSessionProvider).value;
    final name = session?.name.trim().isNotEmpty == true
        ? session!.name.trim()
        : 'Cuenta local';
    final initials = name
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0].toUpperCase())
        .join();

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Row(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: const BoxDecoration(
              color: AppColors.darkBackground,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              initials.isEmpty ? 'N' : initials,
              style: textTheme.titleLarge?.copyWith(color: Colors.white),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: textTheme.titleLarge),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  session?.email ?? 'Tus datos permanecen en este dispositivo',
                  style: textTheme.bodyMedium,
                ),
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    SummaryChip(
                      label: session == null
                          ? 'Cuenta local'
                          : 'Cuenta conectada',
                      icon: session == null
                          ? Icons.phone_android_rounded
                          : Icons.cloud_done_rounded,
                      color: AppColors.info,
                    ),
                    if (session != null)
                      InkWell(
                        onTap: () async {
                          await ref.read(authSessionProvider.notifier).logout();
                          if (context.mounted) context.go('/login');
                        },
                        borderRadius: BorderRadius.circular(999),
                        child: const SummaryChip(
                          label: 'Cerrar sesión',
                          icon: Icons.logout_rounded,
                          color: AppColors.danger,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SwitchSettingTile extends StatelessWidget {
  const _SwitchSettingTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String description;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        ModuleBadge(icon: icon, color: color, size: 38),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: textTheme.titleMedium),
              const SizedBox(height: AppSpacing.xs),
              Text(description, style: textTheme.bodySmall),
            ],
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Switch.adaptive(value: value, onChanged: onChanged),
      ],
    );
  }
}

class _InfoSettingTile extends StatelessWidget {
  const _InfoSettingTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.value,
    this.chipLabel,
    this.chipIcon,
    this.onTap,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String value;
  final String? chipLabel;
  final IconData? chipIcon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
        child: Row(
          children: [
            ModuleBadge(icon: icon, color: color, size: 38),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: textTheme.titleMedium),
                  if (chipLabel != null) ...[
                    const SizedBox(height: AppSpacing.xs),
                    SummaryChip(
                      label: chipLabel!,
                      icon: chipIcon,
                      color: color,
                    ),
                  ] else if (value.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Text(value, style: textTheme.bodySmall),
                  ],
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Icon(
              Icons.chevron_right_rounded,
              color: AppColors.textMuted,
              size: 22,
            ),
          ],
        ),
      ),
    );
  }
}

class _SettingsFooter extends StatelessWidget {
  const _SettingsFooter();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      children: [
        Text('Nexo', style: textTheme.titleLarge),
        const SizedBox(height: AppSpacing.xs),
        Text('Versión 1.0.0', style: textTheme.bodySmall),
        const SizedBox(height: AppSpacing.xs),
        Text('Tus datos, bajo tu control.', style: textTheme.bodySmall),
      ],
    );
  }
}
