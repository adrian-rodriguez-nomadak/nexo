import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
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

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final Map<String, bool> _switches = {
    'pin': true,
    'biometrics': true,
    'lockOnExit': false,
    'reminders': true,
    'upcomingPayments': true,
    'dailySummary': true,
    'nightSummary': false,
    'smartInbox': true,
    'confirmBeforeSave': true,
    'automaticSummaries': false,
  };

  void _setSwitch(String key, bool value) {
    setState(() {
      _switches[key] = value;
    });
  }

  void _showSimulatedAction(BuildContext context, String label) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('$label simulado')));
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
                    value: _switches['pin']!,
                    onChanged: (value) => _setSwitch('pin', value),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.fingerprint_rounded,
                    color: AppColors.primaryDark,
                    title: 'Huella / Face ID',
                    description: 'Acceso rápido con biometría del dispositivo.',
                    value: _switches['biometrics']!,
                    onChanged: (value) => _setSwitch('biometrics', value),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.lock_rounded,
                    color: AppColors.calendar,
                    title: 'Bloquear app al salir',
                    description: 'Vuelve a pedir acceso al regresar.',
                    value: _switches['lockOnExit']!,
                    onChanged: (value) => _setSwitch('lockOnExit', value),
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
                    value: _switches['reminders']!,
                    onChanged: (value) => _setSwitch('reminders', value),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.payments_rounded,
                    color: AppColors.subscription,
                    title: 'Pagos próximos',
                    description: 'Alertas para suscripciones, deudas y pagos.',
                    value: _switches['upcomingPayments']!,
                    onChanged: (value) => _setSwitch('upcomingPayments', value),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.wb_sunny_rounded,
                    color: AppColors.warning,
                    title: 'Resumen diario',
                    description: 'Una vista breve para iniciar el día.',
                    value: _switches['dailySummary']!,
                    onChanged: (value) => _setSwitch('dailySummary', value),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.nightlight_round,
                    color: AppColors.secondary,
                    title: 'Resumen nocturno',
                    description: 'Cierre visual con pendientes y movimientos.',
                    value: _switches['nightSummary']!,
                    onChanged: (value) => _setSwitch('nightSummary', value),
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
                    value: 'Quincenal',
                    onTap: () => _showSimulatedAction(context, 'Presupuesto'),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _InfoSettingTile(
                    icon: Icons.attach_money_rounded,
                    color: AppColors.primaryDark,
                    title: 'Moneda',
                    value: 'MXN',
                    onTap: () => _showSimulatedAction(context, 'Moneda'),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _InfoSettingTile(
                    icon: Icons.light_mode_rounded,
                    color: AppColors.warning,
                    title: 'Tema',
                    value: 'Claro',
                    onTap: () => _showSimulatedAction(context, 'Tema'),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _InfoSettingTile(
                    icon: Icons.category_rounded,
                    color: AppColors.accent,
                    title: 'Categorías',
                    value: '',
                    onTap: () => _showSimulatedAction(context, 'Categorías'),
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
                    onTap: () => _showSimulatedAction(context, 'Datos locales'),
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
                    chipLabel: 'Próximamente',
                    chipIcon: Icons.schedule_rounded,
                    onTap: () =>
                        _showSimulatedAction(context, 'Exportar información'),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _InfoSettingTile(
                    icon: Icons.delete_outline_rounded,
                    color: AppColors.danger,
                    title: 'Borrar datos',
                    value: '',
                    onTap: () => _showSimulatedAction(context, 'Borrar datos'),
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
                    value: _switches['smartInbox']!,
                    onChanged: (value) => _setSwitch('smartInbox', value),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.rule_rounded,
                    color: AppColors.task,
                    title: 'Confirmar antes de guardar',
                    description: 'Revisa cada sugerencia antes de aceptarla.',
                    value: _switches['confirmBeforeSave']!,
                    onChanged: (value) =>
                        _setSwitch('confirmBeforeSave', value),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SwitchSettingTile(
                    icon: Icons.summarize_rounded,
                    color: AppColors.secondary,
                    title: 'Resúmenes automáticos',
                    description: 'Prepara síntesis visuales de tu actividad.',
                    value: _switches['automaticSummaries']!,
                    onChanged: (value) =>
                        _setSwitch('automaticSummaries', value),
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

class _ProfileCard extends StatelessWidget {
  const _ProfileCard();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

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
              'AR',
              style: textTheme.titleLarge?.copyWith(color: Colors.white),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Adrián', style: textTheme.titleLarge),
                const SizedBox(height: AppSpacing.xs),
                Text('Cuenta local de prototipo', style: textTheme.bodyMedium),
                const SizedBox(height: AppSpacing.md),
                const Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    SummaryChip(
                      label: 'UI prototipo',
                      icon: Icons.visibility_rounded,
                      color: AppColors.info,
                    ),
                    SummaryChip(
                      label: 'Sin datos reales',
                      icon: Icons.verified_user_rounded,
                      color: AppColors.primaryDark,
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
  final ValueChanged<bool> onChanged;

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
        Text('Versión UI prototype 0.1.0', style: textTheme.bodySmall),
        const SizedBox(height: AppSpacing.xs),
        Text('Sin datos reales todavía.', style: textTheme.bodySmall),
      ],
    );
  }
}
