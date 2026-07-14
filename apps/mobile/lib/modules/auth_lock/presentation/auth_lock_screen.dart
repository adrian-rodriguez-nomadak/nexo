import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/summary_chip.dart';

class AuthLockScreen extends StatefulWidget {
  const AuthLockScreen({super.key});

  @override
  State<AuthLockScreen> createState() => _AuthLockScreenState();
}

class _AuthLockScreenState extends State<AuthLockScreen> {
  String _pin = '';

  void _addDigit(String digit) {
    if (_pin.length >= 4) return;

    final nextPin = '$_pin$digit';
    setState(() {
      _pin = nextPin;
    });

    if (nextPin.length == 4) {
      _completeAccess('Acceso simulado');
    }
  }

  void _removeDigit() {
    if (_pin.isEmpty) return;

    setState(() {
      _pin = _pin.substring(0, _pin.length - 1);
    });
  }

  void _completeAccess(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
    context.go('/');
  }

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
            const _AuthHeader(),
            const SizedBox(height: AppSpacing.xxxl),
            Text(
              'Protegemos tu información personal.',
              style: textTheme.displayMedium,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Tus finanzas, recordatorios y datos personales estarán protegidos con PIN o biometría.',
              style: textTheme.bodyLarge?.copyWith(
                color: AppColors.textSecondary,
                height: 1.35,
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            _PinCard(
              filledCount: _pin.length,
              onDigitTap: _addDigit,
              onBackspaceTap: _removeDigit,
            ),
            const SizedBox(height: AppSpacing.xxl),
            ElevatedButton.icon(
              onPressed: () => _completeAccess('Biometría simulada'),
              icon: const Icon(Icons.fingerprint_rounded),
              label: const Text('Usar huella / Face ID'),
            ),
            const SizedBox(height: AppSpacing.md),
            OutlinedButton.icon(
              onPressed: () => context.go('/'),
              icon: const Icon(Icons.no_encryption_gmailerrorred_rounded),
              label: const Text('Entrar sin bloqueo'),
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
                  label: 'Seguridad simulada',
                  icon: Icons.shield_rounded,
                  color: AppColors.primaryDark,
                ),
                SummaryChip(
                  label: 'Sin datos reales',
                  icon: Icons.verified_user_rounded,
                  color: AppColors.secondary,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthHeader extends StatelessWidget {
  const _AuthHeader();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        const _SecureNexoMark(),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Nexo', style: textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.xs),
              Text('Acceso seguro', style: textTheme.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }
}

class _SecureNexoMark extends StatelessWidget {
  const _SecureNexoMark();

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
            top: 14,
            right: 15,
            child: _SecureNode(size: 8, color: AppColors.primary),
          ),
          Positioned(
            bottom: 15,
            left: 17,
            child: _SecureNode(size: 7, color: AppColors.accent),
          ),
          Icon(Icons.shield_rounded, color: Colors.white, size: 27),
          Positioned(
            bottom: 18,
            right: 18,
            child: Icon(Icons.lock_rounded, color: AppColors.primary, size: 13),
          ),
        ],
      ),
    );
  }
}

class _SecureNode extends StatelessWidget {
  const _SecureNode({required this.size, required this.color});

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

class _PinCard extends StatelessWidget {
  const _PinCard({
    required this.filledCount,
    required this.onDigitTap,
    required this.onBackspaceTap,
  });

  final int filledCount;
  final ValueChanged<String> onDigitTap;
  final VoidCallback onBackspaceTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        children: [
          const ModuleBadge(
            icon: Icons.lock_rounded,
            color: AppColors.primaryDark,
            size: 48,
          ),
          const SizedBox(height: AppSpacing.lg),
          Text('Ingresa tu PIN', style: textTheme.titleLarge),
          const SizedBox(height: AppSpacing.lg),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              4,
              (index) => _PinDot(isFilled: index < filledCount),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          _PinKeypad(onDigitTap: onDigitTap, onBackspaceTap: onBackspaceTap),
        ],
      ),
    );
  }
}

class _PinDot extends StatelessWidget {
  const _PinDot({required this.isFilled});

  final bool isFilled;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      width: 14,
      height: 14,
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
      decoration: BoxDecoration(
        color: isFilled ? AppColors.primaryDark : Colors.transparent,
        shape: BoxShape.circle,
        border: Border.all(
          color: isFilled ? AppColors.primaryDark : AppColors.borderLight,
          width: 1.5,
        ),
      ),
    );
  }
}

class _PinKeypad extends StatelessWidget {
  const _PinKeypad({required this.onDigitTap, required this.onBackspaceTap});

  final ValueChanged<String> onDigitTap;
  final VoidCallback onBackspaceTap;

  static const _keys = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '',
    '0',
    'backspace',
  ];

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      itemCount: _keys.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        childAspectRatio: 1.55,
      ),
      itemBuilder: (context, index) {
        final keyValue = _keys[index];

        if (keyValue.isEmpty) {
          return const SizedBox.shrink();
        }

        if (keyValue == 'backspace') {
          return _KeypadButton(
            icon: Icons.backspace_outlined,
            onTap: onBackspaceTap,
          );
        }

        return _KeypadButton(
          label: keyValue,
          onTap: () => onDigitTap(keyValue),
        );
      },
    );
  }
}

class _KeypadButton extends StatelessWidget {
  const _KeypadButton({required this.onTap, this.label, this.icon});

  final String? label;
  final IconData? icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Material(
      color: AppColors.lightBackground,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: icon == null
              ? Text(label!, style: textTheme.titleLarge)
              : Icon(icon, color: AppColors.textSecondary, size: 21),
        ),
      ),
    );
  }
}
