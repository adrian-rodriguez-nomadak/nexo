import '../../modules/domain/nexo_module.dart';

class ObserverScope {
  const ObserverScope({
    required this.module,
    required this.submodule,
    required this.name,
    required this.attentionRule,
    this.enabled = false,
  });

  final NexoModule module;
  final String submodule;
  final String name;
  final String attentionRule;
  final bool enabled;

  String get id => '${module.id}.$submodule';

  ObserverScope copyWith({bool? enabled}) {
    return ObserverScope(
      module: module,
      submodule: submodule,
      name: name,
      attentionRule: attentionRule,
      enabled: enabled ?? this.enabled,
    );
  }
}

class ObserverModulePermission {
  const ObserverModulePermission({required this.module, required this.scopes});

  final NexoModule module;
  final List<ObserverScope> scopes;

  bool get enabled => scopes.any((scope) => scope.enabled);
  int get enabledCount => scopes.where((scope) => scope.enabled).length;

  ObserverModulePermission setAll(bool enabled) {
    return ObserverModulePermission(
      module: module,
      scopes: [for (final scope in scopes) scope.copyWith(enabled: enabled)],
    );
  }

  ObserverModulePermission setScope(String submodule, bool enabled) {
    return ObserverModulePermission(
      module: module,
      scopes: [
        for (final scope in scopes)
          scope.submodule == submodule
              ? scope.copyWith(enabled: enabled)
              : scope,
      ],
    );
  }
}

abstract final class ObserverSettings {
  static List<ObserverModulePermission> defaults() {
    return [
      _module(NexoModules.finances, const [
        ('accounts', 'Cuentas', 'Nombres, tipos y saldos de cuentas propias.'),
        (
          'transactions',
          'Movimientos',
          'Ingresos, gastos, cargos, depósitos y retiros.',
        ),
        (
          'transfers',
          'Transferencias',
          'Movimientos entre tus propias cuentas.',
        ),
        ('balances', 'Saldos', 'Balances y estados de cuenta propios.'),
      ]),
      _module(NexoModules.events, const [
        ('appointments', 'Citas', 'Compromisos con fecha, hora o lugar.'),
        (
          'reminders',
          'Recordatorios',
          'Acciones futuras que no quieres olvidar.',
        ),
        ('reservations', 'Reservaciones', 'Vuelos, hoteles, mesas y entradas.'),
        ('deadlines', 'Fechas límite', 'Entregas, vencimientos y plazos.'),
      ]),
      _module(NexoModules.notes, const [
        ('ideas', 'Ideas', 'Pensamientos y propuestas útiles.'),
        ('tasks', 'Tareas', 'Pendientes y acciones concretas.'),
        ('references', 'Referencias', 'Información para consultar después.'),
        ('lists', 'Listas', 'Compras, pasos y colecciones.'),
      ]),
      _module(NexoModules.bets, const [
        ('tickets', 'Boletos', 'Apuestas ya realizadas y sus selecciones.'),
        ('results', 'Resultados', 'Apuestas ganadas, perdidas o anuladas.'),
        ('bankroll', 'Bankroll', 'Saldo destinado a apuestas.'),
        ('limits', 'Límites', 'Topes y presupuestos personales.'),
      ]),
      _module(NexoModules.meals, const [
        ('logs', 'Comidas', 'Alimentos y bebidas consumidos.'),
        ('nutrition', 'Nutrición', 'Calorías, macros y porciones.'),
        ('recipes', 'Recetas', 'Ingredientes e instrucciones.'),
        ('costs', 'Costos', 'Precios de alimentos y comidas.'),
      ]),
      _module(NexoModules.health, const [
        ('profile', 'Perfil', 'Alergias, medicamentos y condiciones.'),
        ('sleep', 'Sueño', 'Horas y calidad de sueño.'),
        ('hydration', 'Hidratación', 'Agua y líquidos consumidos.'),
        (
          'vitals',
          'Signos vitales',
          'Peso, pulso, presión y otras mediciones.',
        ),
        ('symptoms', 'Síntomas', 'Síntomas explícitos sin hacer diagnósticos.'),
      ]),
      _module(NexoModules.gym, const [
        ('workouts', 'Entrenamientos', 'Sesiones, rutinas y duración.'),
        ('strength', 'Fuerza', 'Series, repeticiones y peso.'),
        ('cardio', 'Cardio', 'Distancia, tiempo y ritmo.'),
        ('mobility', 'Movilidad', 'Estiramientos y movilidad.'),
      ]),
    ];
  }

  static ObserverModulePermission _module(
    NexoModule module,
    List<(String, String, String)> definitions,
  ) {
    return ObserverModulePermission(
      module: module,
      scopes: [
        for (final definition in definitions)
          ObserverScope(
            module: module,
            submodule: definition.$1,
            name: definition.$2,
            attentionRule: definition.$3,
          ),
      ],
    );
  }

  static List<ObserverScope> scopesForModule(String moduleId) {
    return defaults()
        .where((permission) => permission.module.id == moduleId)
        .expand((permission) => permission.scopes)
        .toList();
  }
}
