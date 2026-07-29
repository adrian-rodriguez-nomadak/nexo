import 'package:flutter/material.dart';

import '../../../app/theme/nexo_theme.dart';
import '../../../shared/presentation/module_card.dart';
import '../../auth/domain/nexo_session.dart';
import '../../capture/presentation/capture_sheet.dart';
import '../../modules/domain/nexo_module.dart';

class TodayScreen extends StatelessWidget {
  const TodayScreen({
    required this.captures,
    required this.isLoading,
    required this.user,
    required this.onSignOut,
    required this.onCapture,
    required this.onOpenModule,
    super.key,
  });

  final List<CaptureDraft> captures;
  final bool isLoading;
  final NexoUser user;
  final Future<void> Function() onSignOut;
  final VoidCallback onCapture;
  final ValueChanged<NexoModule> onOpenModule;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 110),
            sliver: SliverList.list(
              children: [
                _Header(date: DateTime.now(), user: user, onSignOut: onSignOut),
                const SizedBox(height: 28),
                _ContextCard(onCapture: onCapture),
                if (isLoading) ...[
                  const SizedBox(height: 24),
                  const LinearProgressIndicator(),
                ] else if (captures.isNotEmpty) ...[
                  const SizedBox(height: 28),
                  const _SectionTitle(
                    title: 'Última captura',
                    subtitle: 'Guardada en esta sesión',
                  ),
                  const SizedBox(height: 12),
                  _LatestCaptureCard(capture: captures.first),
                ],
                const SizedBox(height: 30),
                const _SectionTitle(
                  title: 'Tus espacios',
                  subtitle: 'Todo lo importante, conectado',
                ),
                const SizedBox(height: 14),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: NexoModules.all.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.28,
                  ),
                  itemBuilder: (context, index) {
                    final module = NexoModules.all[index];
                    return ModuleCard(
                      module: module,
                      compact: true,
                      onTap: () => onOpenModule(module),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.date,
    required this.user,
    required this.onSignOut,
  });

  final DateTime date;
  final NexoUser user;
  final Future<void> Function() onSignOut;

  static const _weekdays = [
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
    'domingo',
  ];

  static const _months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  @override
  Widget build(BuildContext context) {
    final formattedDate =
        '${_weekdays[date.weekday - 1]}, ${date.day} de ${_months[date.month - 1]}';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                formattedDate.toUpperCase(),
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: NexoColors.lime,
                  fontSize: 11,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 6),
              Text('Tu día.', style: Theme.of(context).textTheme.displaySmall),
            ],
          ),
        ),
        IconButton(
          key: const Key('profile-button'),
          onPressed: () => _showProfile(context),
          style: IconButton.styleFrom(
            fixedSize: const Size(48, 48),
            backgroundColor: NexoColors.surface,
            side: const BorderSide(color: NexoColors.border),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(15),
            ),
          ),
          icon: const Icon(Icons.person_outline_rounded, size: 21),
        ),
      ],
    );
  }

  Future<void> _showProfile(BuildContext context) async {
    final shouldSignOut = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: NexoColors.surface,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                user.displayName,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 4),
              Text(user.email, style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: () => Navigator.pop(context, true),
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Cerrar sesión'),
              ),
            ],
          ),
        ),
      ),
    );
    if (shouldSignOut == true) await onSignOut();
  }
}

class _ContextCard extends StatelessWidget {
  const _ContextCard({required this.onCapture});

  final VoidCallback onCapture;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: NexoColors.lime,
        borderRadius: BorderRadius.circular(26),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: NexoColors.background.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(99),
            ),
            child: const Text(
              'EMPIEZA AQUÍ',
              style: TextStyle(
                color: NexoColors.background,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            '¿Qué está pasando\nhoy?',
            style: TextStyle(
              color: NexoColors.background,
              fontSize: 29,
              height: 1.05,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.8,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Registra un gasto, una idea, una comida o un entrenamiento.',
            style: TextStyle(
              color: Color(0xC90C0C0E),
              fontSize: 14,
              height: 1.4,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: onCapture,
            style: FilledButton.styleFrom(
              backgroundColor: NexoColors.background,
              foregroundColor: NexoColors.text,
              minimumSize: const Size.fromHeight(50),
            ),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Agregar dato o captura'),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 11),
        ),
      ],
    );
  }
}

class _LatestCaptureCard extends StatelessWidget {
  const _LatestCaptureCard({required this.capture});

  final CaptureDraft capture;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: capture.module.color.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(capture.module.icon, color: capture.module.color),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    capture.module.name,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: capture.module.color,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    capture.text.isEmpty ? 'Captura de pantalla' : capture.text,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  if (capture.hasImage) ...[
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.memory(
                        capture.imageBytes!,
                        width: double.infinity,
                        height: 150,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
