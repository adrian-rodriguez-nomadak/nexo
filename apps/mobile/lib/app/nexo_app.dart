import 'package:flutter/material.dart';

import 'navigation/nexo_shell.dart';
import 'theme/nexo_theme.dart';

class NexoApp extends StatelessWidget {
  const NexoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nexo',
      debugShowCheckedModeBanner: false,
      theme: NexoTheme.dark(),
      home: const NexoShell(),
    );
  }
}
