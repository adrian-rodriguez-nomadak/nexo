import 'package:flutter/material.dart';

import '../../../app/theme/nexo_theme.dart';

class ProgressScreen extends StatelessWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 22, 20, 110),
        children: [
          Text('Progreso', style: Theme.of(context).textTheme.displaySmall),
          const SizedBox(height: 8),
          Text(
            'Aquí aparecerán las conexiones entre tu dinero, tiempo y bienestar.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 30),
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: NexoColors.surface,
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: NexoColors.border),
            ),
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: NexoColors.lime.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.hub_rounded,
                    color: NexoColors.lime,
                    size: 30,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'Primero, crea contexto',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Cuando existan registros suficientes, Nexo mostrará tendencias '
                  'reales sin inventar conclusiones.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          const _ConnectionPreview(
            icon: Icons.restaurant_rounded,
            title: 'Comidas × Finanzas',
            description: 'Costo de comer fuera y evolución de tu presupuesto.',
          ),
          const SizedBox(height: 10),
          const _ConnectionPreview(
            icon: Icons.fitness_center_rounded,
            title: 'Gimnasio × Salud',
            description: 'Entrenamiento, descanso y señales de recuperación.',
          ),
          const SizedBox(height: 10),
          const _ConnectionPreview(
            icon: Icons.sports_soccer_rounded,
            title: 'Apuestas × Finanzas',
            description: 'Riesgo total, límites y efecto en tus metas.',
          ),
        ],
      ),
    );
  }
}

class _ConnectionPreview extends StatelessWidget {
  const _ConnectionPreview({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: 0.58,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(icon, color: NexoColors.muted),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 3),
                    Text(
                      description,
                      style: Theme.of(
                        context,
                      ).textTheme.bodyMedium?.copyWith(fontSize: 12),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.lock_outline_rounded, size: 17),
            ],
          ),
        ),
      ),
    );
  }
}
