import 'package:flutter/material.dart';

import '../../../app/theme/nexo_theme.dart';
import '../domain/nexo_module.dart';

class ModuleDetailScreen extends StatelessWidget {
  const ModuleDetailScreen({
    required this.module,
    required this.onCapture,
    super.key,
  });

  final NexoModule module;
  final VoidCallback onCapture;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: NexoColors.background,
        surfaceTintColor: Colors.transparent,
        title: Text(module.name),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 62,
                height: 62,
                decoration: BoxDecoration(
                  color: module.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Icon(module.icon, color: module.color, size: 31),
              ),
              const SizedBox(height: 24),
              Text(
                module.description,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 10),
              Text(
                'Este espacio está listo para recibir su primer registro. '
                'Construiremos sus funciones alrededor de datos reales, no de pantallas vacías.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: NexoColors.surface,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: NexoColors.border),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.auto_awesome_rounded,
                      color: module.color,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Sin datos todavía. Tu primera captura será el punto de partida.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: onCapture,
                icon: const Icon(Icons.add_rounded),
                label: Text('Agregar a ${module.name.toLowerCase()}'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
