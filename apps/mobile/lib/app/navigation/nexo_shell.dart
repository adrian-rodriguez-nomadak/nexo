import 'package:flutter/material.dart';

import '../../features/capture/presentation/capture_sheet.dart';
import '../../features/modules/domain/nexo_module.dart';
import '../../features/modules/presentation/module_detail_screen.dart';
import '../../features/modules/presentation/modules_screen.dart';
import '../../features/progress/presentation/progress_screen.dart';
import '../../features/today/presentation/today_screen.dart';

class NexoShell extends StatefulWidget {
  const NexoShell({super.key});

  @override
  State<NexoShell> createState() => _NexoShellState();
}

class _NexoShellState extends State<NexoShell> {
  int _selectedIndex = 0;
  final List<CaptureDraft> _captures = [];

  Future<void> _capture({NexoModule? module}) async {
    final draft = await showNexoCaptureSheet(context, initialModule: module);
    if (!mounted || draft == null) return;

    setState(() {
      _captures.insert(0, draft);
      _selectedIndex = 0;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Captura agregada a ${draft.module.name}.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _openModule(NexoModule module) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ModuleDetailScreen(
          module: module,
          onCapture: () => _capture(module: module),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      TodayScreen(
        captures: _captures,
        onCapture: _capture,
        onOpenModule: _openModule,
      ),
      ModulesScreen(onOpenModule: _openModule),
      const ProgressScreen(),
    ];

    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _selectedIndex, children: screens),
      floatingActionButton: FloatingActionButton(
        key: const Key('capture-fab'),
        onPressed: _capture,
        tooltip: 'Capturar',
        child: const Icon(Icons.add_rounded),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() => _selectedIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.today_outlined),
            selectedIcon: Icon(Icons.today_rounded),
            label: 'Hoy',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view_rounded),
            label: 'Módulos',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights_rounded),
            label: 'Progreso',
          ),
        ],
      ),
    );
  }
}
