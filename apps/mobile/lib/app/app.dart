import 'package:flutter/material.dart';

import '../modules/memory/presentation/memory_home.dart';
import '../modules/memory/presentation/memory_auth_gate.dart';
import '../modules/memory/security/memory_security.dart';

class NexoApp extends StatelessWidget {
  const NexoApp({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = ColorScheme.fromSeed(
      seedColor: const Color(0xFF6656D9),
      brightness: Brightness.light,
      surface: const Color(0xFFF8F7F3),
    );

    return MaterialApp(
      title: 'Nexo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colors,
        scaffoldBackgroundColor: const Color(0xFFF8F7F3),
        fontFamily: 'SF Pro Display',
        navigationBarTheme: NavigationBarThemeData(
          height: 70,
          elevation: 0,
          backgroundColor: Colors.white,
          indicatorColor: const Color(0xFFECE9FF),
          labelTextStyle: WidgetStateProperty.all(
            const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFFE4E1DB)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFFE4E1DB)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFF6656D9), width: 1.5),
          ),
        ),
      ),
      home: const MemoryAuthGate(
        child: MemorySecurityGate(child: MemoryHome()),
      ),
    );
  }
}
