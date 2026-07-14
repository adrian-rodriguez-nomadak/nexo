import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/summary_chip.dart';

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.xxl,
            AppSpacing.screenPadding,
            130,
          ),
          children: [
            const _OnboardingHeader(),
            const SizedBox(height: AppSpacing.xxxl),
            Text(
              'Organiza tu día, tu dinero y tus pendientes en un solo lugar.',
              style: textTheme.displayMedium,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Nexo centraliza tus tareas, calendario, finanzas y recordatorios para ayudarte a tomar mejores decisiones durante el día.',
              style: textTheme.bodyLarge?.copyWith(
                color: AppColors.textSecondary,
                height: 1.35,
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const _BenefitsGrid(),
            const SizedBox(height: AppSpacing.xxl),
            const _InitialSetupCard(),
            const SizedBox(height: AppSpacing.xxl),
            ElevatedButton.icon(
              onPressed: () => context.go('/login'),
              icon: const Icon(Icons.arrow_forward_rounded),
              label: const Text('Crear cuenta o ingresar'),
            ),
            const SizedBox(height: AppSpacing.md),
            OutlinedButton.icon(
              onPressed: () => context.go('/auth-lock'),
              icon: const Icon(Icons.lock_rounded),
              label: const Text('Ver bloqueo'),
            ),
            const SizedBox(height: AppSpacing.lg),
            const Wrap(
              alignment: WrapAlignment.center,
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
    );
  }
}

class _OnboardingHeader extends StatelessWidget {
  const _OnboardingHeader();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        const _NexoMark(),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Nexo', style: textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.xs),
              Text('Tu vida conectada', style: textTheme.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }
}

class _NexoMark extends StatelessWidget {
  const _NexoMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 62,
      height: 62,
      decoration: const BoxDecoration(
        color: AppColors.darkBackground,
        shape: BoxShape.circle,
      ),
      child: Stack(
        alignment: Alignment.center,
        children: const [
          Positioned(
            top: 15,
            left: 17,
            child: _NexoNode(size: 8, color: AppColors.primary),
          ),
          Positioned(
            right: 16,
            top: 18,
            child: _NexoNode(size: 7, color: AppColors.accent),
          ),
          Positioned(
            bottom: 15,
            left: 23,
            child: _NexoNode(size: 9, color: AppColors.secondary),
          ),
          Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 24),
        ],
      ),
    );
  }
}

class _NexoNode extends StatelessWidget {
  const _NexoNode({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _BenefitsGrid extends StatelessWidget {
  const _BenefitsGrid();

  static const _benefits = [
    _BenefitData(
      icon: Icons.dashboard_rounded,
      color: AppColors.primaryDark,
      title: 'Dashboard diario',
      description: 'Ve lo importante al iniciar tu día.',
    ),
    _BenefitData(
      icon: Icons.account_balance_wallet_rounded,
      color: AppColors.finance,
      title: 'Finanzas personales',
      description: 'Consulta cuánto tienes disponible y qué pagos vienen.',
    ),
    _BenefitData(
      icon: Icons.auto_awesome_rounded,
      color: AppColors.task,
      title: 'Inbox inteligente',
      description:
          'Registra gastos, tareas y recordatorios escribiendo natural.',
    ),
    _BenefitData(
      icon: Icons.shield_rounded,
      color: AppColors.info,
      title: 'Seguridad local',
      description: 'Diseñado para proteger tu información personal.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      itemCount: _benefits.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        childAspectRatio: 0.9,
      ),
      itemBuilder: (context, index) {
        return _BenefitCard(data: _benefits[index]);
      },
    );
  }
}

class _BenefitData {
  const _BenefitData({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String description;
}

class _BenefitCard extends StatelessWidget {
  const _BenefitCard({required this.data});

  final _BenefitData data;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ModuleBadge(icon: data.icon, color: data.color, size: 38),
          const Spacer(),
          Text(data.title, style: textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Text(
            data.description,
            style: textTheme.bodySmall?.copyWith(height: 1.25),
          ),
        ],
      ),
    );
  }
}

class _InitialSetupCard extends StatelessWidget {
  const _InitialSetupCard();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const ModuleBadge(
                icon: Icons.tune_rounded,
                color: AppColors.primaryDark,
                size: 40,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Configuración inicial', style: textTheme.titleLarge),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Simulada para el prototipo',
                      style: textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          const _SetupSelector(
            icon: Icons.person_rounded,
            color: AppColors.info,
            label: 'Nombre',
            value: 'Adrián',
          ),
          const SizedBox(height: AppSpacing.md),
          const _SetupSelector(
            icon: Icons.savings_rounded,
            color: AppColors.finance,
            label: 'Presupuesto',
            value: 'Quincenal',
          ),
          const SizedBox(height: AppSpacing.md),
          const _SetupSelector(
            icon: Icons.attach_money_rounded,
            color: AppColors.primaryDark,
            label: 'Moneda',
            value: 'MXN',
          ),
        ],
      ),
    );
  }
}

class _SetupSelector extends StatelessWidget {
  const _SetupSelector({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color color;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          ModuleBadge(icon: icon, color: color, size: 34),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: textTheme.bodySmall),
                const SizedBox(height: AppSpacing.xs),
                Text(value, style: textTheme.titleMedium),
              ],
            ),
          ),
          const Icon(
            Icons.expand_more_rounded,
            color: AppColors.textMuted,
            size: 22,
          ),
        ],
      ),
    );
  }
}
