import 'package:flutter/material.dart';

import '../../../app/theme/nexo_theme.dart';
import '../../../shared/presentation/module_card.dart';
import '../domain/nexo_module.dart';

class ModulesScreen extends StatelessWidget {
  const ModulesScreen({
    required this.onOpenModule,
    required this.onOpenObserver,
    super.key,
  });

  final ValueChanged<NexoModule> onOpenModule;
  final VoidCallback onOpenObserver;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tus módulos',
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Cada espacio entiende una parte de tu vida. Nexo los conecta.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _ObserverCard(onTap: onOpenObserver),
                const SizedBox(height: 18),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.92,
                  ),
                  itemCount: NexoModules.all.length,
                  itemBuilder: (context, index) {
                    final module = NexoModules.all[index];
                    return ModuleCard(
                      module: module,
                      onTap: () => onOpenModule(module),
                    );
                  },
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _ObserverCard extends StatelessWidget {
  const _ObserverCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: NexoColors.surface,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        key: const Key('observer-module-card'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: NexoColors.lime.withValues(alpha: 0.5)),
          ),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: NexoColors.lime.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(17),
                ),
                child: const Icon(
                  Icons.visibility_rounded,
                  color: NexoColors.lime,
                ),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Observador',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Deja que Omi detecte y guarde lo importante.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}
