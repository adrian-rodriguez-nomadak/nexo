import 'package:flutter/material.dart';

import '../../../shared/presentation/module_card.dart';
import '../domain/nexo_module.dart';

class ModulesScreen extends StatelessWidget {
  const ModulesScreen({required this.onOpenModule, super.key});

  final ValueChanged<NexoModule> onOpenModule;

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
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.92,
              ),
              delegate: SliverChildBuilderDelegate((context, index) {
                final module = NexoModules.all[index];
                return ModuleCard(
                  module: module,
                  onTap: () => onOpenModule(module),
                );
              }, childCount: NexoModules.all.length),
            ),
          ),
        ],
      ),
    );
  }
}
