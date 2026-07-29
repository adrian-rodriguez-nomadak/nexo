import 'package:flutter/material.dart';

import '../../../app/theme/nexo_theme.dart';
import '../../../core/network/nexo_api.dart';
import '../domain/nexo_module.dart';

class ModuleDetailScreen extends StatefulWidget {
  const ModuleDetailScreen({
    required this.module,
    required this.onCapture,
    required this.api,
    super.key,
  });

  final NexoModule module;
  final Future<void> Function() onCapture;
  final NexoApi api;

  @override
  State<ModuleDetailScreen> createState() => _ModuleDetailScreenState();
}

class _ModuleDetailScreenState extends State<ModuleDetailScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final data = await widget.api.get('/api/${widget.module.id}');
      if (mounted) setState(() => _data = data);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _capture() async {
    await widget.onCapture();
    await _load();
  }

  List<Map<String, dynamic>> get _records {
    final data = _data;
    if (data == null) return [];
    final key = switch (widget.module.id) {
      'finances' => 'transactions',
      'events' => 'events',
      'notes' => 'notes',
      'bets' => 'bets',
      'meals' => 'meals',
      'health' => 'entries',
      'gym' => 'workouts',
      _ => '',
    };
    return (data[key] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final module = widget.module;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: NexoColors.background,
        surfaceTintColor: Colors.transparent,
        title: Text(module.name),
        actions: [
          IconButton(
            onPressed: _isLoading ? null : _load,
            tooltip: 'Actualizar',
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 110),
            children: [
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: module.color.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Icon(module.icon, color: module.color, size: 28),
                  ),
                  const SizedBox(width: 15),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          module.description,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        Text(
                          'Sincronizado con tu cuenta de Nexo',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(36),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_error != null)
                _ErrorCard(message: _error!, onRetry: _load)
              else ...[
                if (module.id == 'finances' && _data?['summary'] is Map)
                  _FinanceSummary(
                    summary: _data!['summary'] as Map<String, dynamic>,
                  ),
                if (module.id == 'finances') const SizedBox(height: 18),
                Text(
                  _records.isEmpty
                      ? 'Aún no hay registros'
                      : 'Registros recientes',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 12),
                if (_records.isEmpty)
                  _EmptyModule(module: module)
                else
                  ..._records
                      .take(30)
                      .map(
                        (record) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _RecordCard(module: module, record: record),
                        ),
                      ),
              ],
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _capture,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Agregar'),
      ),
    );
  }
}

class _FinanceSummary extends StatelessWidget {
  const _FinanceSummary({required this.summary});

  final Map<String, dynamic> summary;

  @override
  Widget build(BuildContext context) {
    final balance = _money(summary['balanceCents'] ?? summary['netCents']);
    final income = _money(summary['incomeCents']);
    final expenses = _money(
      summary['expenseCents'] ?? summary['expensesCents'],
    );
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: NexoColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: NexoColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Balance', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 4),
          Text(balance, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 15),
          Row(
            children: [
              Expanded(
                child: _Metric(label: 'Ingresos', value: income),
              ),
              Expanded(
                child: _Metric(label: 'Gastos', value: expenses),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodyMedium),
        Text(value, style: Theme.of(context).textTheme.titleMedium),
      ],
    );
  }
}

class _RecordCard extends StatelessWidget {
  const _RecordCard({required this.module, required this.record});

  final NexoModule module;
  final Map<String, dynamic> record;

  @override
  Widget build(BuildContext context) {
    final title = _firstText(record, [
      'title',
      'description',
      'content',
      'name',
      'type',
      'sport',
    ]);
    final details = _recordDetails(record);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NexoColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: NexoColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(module.icon, color: module.color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title ?? 'Registro de ${module.name}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (details.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Text(details, style: Theme.of(context).textTheme.bodyMedium),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyModule extends StatelessWidget {
  const _EmptyModule({required this.module});
  final NexoModule module;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: NexoColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: NexoColors.border),
      ),
      child: Text(
        'Los datos que agregues en la web o en el móvil aparecerán aquí.',
        style: Theme.of(context).textTheme.bodyMedium,
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF2B171C),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message),
          TextButton(onPressed: onRetry, child: const Text('Reintentar')),
        ],
      ),
    );
  }
}

String _money(dynamic cents) {
  final value = cents is num ? cents : num.tryParse(cents?.toString() ?? '');
  if (value == null) return '\$0.00';
  return '\$${(value / 100).toStringAsFixed(2)}';
}

String? _firstText(Map<String, dynamic> record, List<String> keys) {
  for (final key in keys) {
    final value = record[key];
    if (value is String && value.trim().isNotEmpty) return value.trim();
  }
  return null;
}

String _recordDetails(Map<String, dynamic> record) {
  final details = <String>[];
  final amount =
      record['amountCents'] ?? record['costCents'] ?? record['stakeCents'];
  if (amount != null) details.add(_money(amount));

  for (final entry in const {
    'startsAt': 'Fecha',
    'occurredAt': 'Fecha',
    'performedAt': 'Fecha',
    'mealType': 'Tipo',
    'status': 'Estado',
    'category': 'Categoría',
    'durationMinutes': 'Duración',
    'sleepMinutes': 'Sueño',
  }.entries) {
    final value = record[entry.key];
    if (value != null && value.toString().isNotEmpty) {
      details.add('${entry.value}: ${value.toString()}');
    }
  }
  return details.take(3).join(' · ');
}
