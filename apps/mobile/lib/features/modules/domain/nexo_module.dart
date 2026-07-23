import 'package:flutter/material.dart';

class NexoModule {
  const NexoModule({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.color,
    required this.prompt,
  });

  final String id;
  final String name;
  final String description;
  final IconData icon;
  final Color color;
  final String prompt;
}

abstract final class NexoModules {
  static const finances = NexoModule(
    id: 'finances',
    name: 'Finanzas',
    description: 'Dinero, presupuestos y metas',
    icon: Icons.account_balance_wallet_rounded,
    color: Color(0xFF78D6A3),
    prompt: 'Ej. Gasté \$280 en la cena',
  );

  static const events = NexoModule(
    id: 'events',
    name: 'Eventos',
    description: 'Agenda, planes y recordatorios',
    icon: Icons.calendar_month_rounded,
    color: Color(0xFF8CB4FF),
    prompt: 'Ej. Partido el sábado a las 7',
  );

  static const notes = NexoModule(
    id: 'notes',
    name: 'Notas',
    description: 'Ideas, listas y memoria',
    icon: Icons.sticky_note_2_rounded,
    color: Color(0xFFFFD166),
    prompt: 'Ej. Idea para el proyecto...',
  );

  static const bets = NexoModule(
    id: 'bets',
    name: 'Apuestas',
    description: 'Bankroll, límites y resultados',
    icon: Icons.sports_soccer_rounded,
    color: Color(0xFFD39BFF),
    prompt: 'Ej. Aposté \$100 con cuota 1.8',
  );

  static const meals = NexoModule(
    id: 'meals',
    name: 'Comidas',
    description: 'Alimentos, macros y costos',
    icon: Icons.restaurant_rounded,
    color: Color(0xFFFF9E75),
    prompt: 'Ej. Comí pollo con arroz',
  );

  static const health = NexoModule(
    id: 'health',
    name: 'Salud',
    description: 'Sueño, agua y bienestar',
    icon: Icons.monitor_heart_rounded,
    color: Color(0xFFFF7F96),
    prompt: 'Ej. Dormí 7 horas',
  );

  static const gym = NexoModule(
    id: 'gym',
    name: 'Gimnasio',
    description: 'Rutinas, marcas y progreso',
    icon: Icons.fitness_center_rounded,
    color: Color(0xFF75D8E8),
    prompt: 'Ej. Press banca 4x8 con 70 kg',
  );

  static const all = [finances, events, notes, bets, meals, health, gym];
}
