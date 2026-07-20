import 'package:flutter/material.dart';

import '../data/insight_feedback_repository.dart';
import '../domain/memory_entry.dart';

enum InsightPeriod { day, week, month }

class SummaryView extends StatefulWidget {
  const SummaryView({required this.entries, super.key});

  final List<MemoryEntry> entries;

  @override
  State<SummaryView> createState() => _SummaryViewState();
}

class _SummaryViewState extends State<SummaryView> {
  InsightPeriod _period = InsightPeriod.week;
  final InsightFeedbackRepository _feedbackRepository =
      const InsightFeedbackRepository();
  Map<String, bool> _feedback = {};

  @override
  void initState() {
    super.initState();
    _loadFeedback();
  }

  Future<void> _loadFeedback() async {
    try {
      final feedback = await _feedbackRepository.load();
      if (mounted) setState(() => _feedback = feedback);
    } catch (_) {
      // Feedback is secondary and must never block the summary.
    }
  }

  List<MemoryEntry> get _periodEntries {
    final now = DateTime.now();
    final start = switch (_period) {
      InsightPeriod.day => DateTime(now.year, now.month, now.day),
      InsightPeriod.week => now.subtract(const Duration(days: 7)),
      InsightPeriod.month => DateTime(now.year, now.month, 1),
    };
    return widget.entries
        .where((entry) => !entry.createdAt.isBefore(start))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final entries = _periodEntries;
    final statistics = InsightStatistics.fromEntries(entries);
    final insights = PersonalInsight.fromEntries(entries, statistics);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 30),
      children: [
        const Text(
          'Resumen',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 5),
        const Text(
          'Patrones construidos únicamente con tus recuerdos.',
          style: TextStyle(color: Color(0xFF77736C)),
        ),
        const SizedBox(height: 20),
        SegmentedButton<InsightPeriod>(
          segments: const [
            ButtonSegment(value: InsightPeriod.day, label: Text('Hoy')),
            ButtonSegment(value: InsightPeriod.week, label: Text('7 días')),
            ButtonSegment(value: InsightPeriod.month, label: Text('Mes')),
          ],
          selected: {_period},
          showSelectedIcon: false,
          onSelectionChanged: (selection) =>
              setState(() => _period = selection.first),
        ),
        const SizedBox(height: 22),
        if (entries.isEmpty)
          const SizedBox(
            height: 430,
            child: _EmptyInsights(),
          )
        else ...[
          _PeriodSummary(entries: entries, statistics: statistics),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  value: '${statistics.events}',
                  label: 'eventos',
                  icon: Icons.bolt_outlined,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  value: '${statistics.people.length}',
                  label: 'personas',
                  icon: Icons.people_outline,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  value: statistics.expenseCount == 0
                      ? '—'
                      : '\$${statistics.expenseTotal.toStringAsFixed(0)}',
                  label: 'gastos',
                  icon: Icons.payments_outlined,
                ),
              ),
            ],
          ),
          if (statistics.topics.isNotEmpty) ...[
            const SizedBox(height: 24),
            const Text(
              'Lo más presente',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: statistics.topics.entries
                  .take(6)
                  .map(
                    (topic) => Chip(
                      label: Text('#${topic.key} · ${topic.value}'),
                      side: BorderSide.none,
                      backgroundColor: const Color(0xFFECE9FF),
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: 26),
          const Text(
            'Recomendaciones para ti',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 5),
          const Text(
            'Cada recomendación muestra la evidencia que la originó.',
            style: TextStyle(color: Color(0xFF77736C), fontSize: 12),
          ),
          const SizedBox(height: 12),
          ...insights.map(
            (insight) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _InsightCard(
                insight: insight,
                feedback: _feedback[insight.id],
                onFeedback: (useful) => _saveFeedback(insight.id, useful),
              ),
            ),
          ),
          if (statistics.people.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'Personas en tu periodo',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            ...statistics.people.entries.take(5).map(
              (person) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFFFE7F1),
                  child: Icon(Icons.person_outline, color: Color(0xFF9A476A)),
                ),
                title: Text(person.key),
                trailing: Text(
                  '${person.value} ${person.value == 1 ? 'mención' : 'menciones'}',
                  style: const TextStyle(color: Color(0xFF77736C)),
                ),
              ),
            ),
          ],
        ],
      ],
    );
  }

  Future<void> _saveFeedback(String id, bool useful) async {
    setState(() => _feedback[id] = useful);
    try {
      await _feedbackRepository.save(_feedback);
    } catch (_) {
      // The visible selection remains available for the current session.
    }
  }
}

class InsightStatistics {
  const InsightStatistics({
    required this.events,
    required this.people,
    required this.topics,
    required this.emotions,
    required this.expenseCount,
    required this.expenseTotal,
    required this.subnotes,
  });

  final int events;
  final Map<String, int> people;
  final Map<String, int> topics;
  final Map<String, int> emotions;
  final int expenseCount;
  final double expenseTotal;
  final int subnotes;

  factory InsightStatistics.fromEntries(List<MemoryEntry> entries) {
    final people = <String, int>{};
    final topics = <String, int>{};
    final emotions = <String, int>{};
    var events = 0;
    var expenseCount = 0;
    var expenseTotal = 0.0;
    var subnotes = 0;
    for (final entry in entries) {
      final analysis = entry.analysis;
      events += analysis?.events.length ?? 1;
      subnotes += entry.details.length;
      for (final person in analysis?.people ?? const <String>[]) {
        people[person] = (people[person] ?? 0) + 1;
      }
      for (final topic in entry.tags) {
        topics[topic] = (topics[topic] ?? 0) + 1;
      }
      for (final emotion in analysis?.emotions ?? const <String>[]) {
        emotions[emotion] = (emotions[emotion] ?? 0) + 1;
      }
      for (final expense in analysis?.expenses ?? const []) {
        expenseCount++;
        expenseTotal += expense.amount ?? 0;
      }
    }
    return InsightStatistics(
      events: events,
      people: _sorted(people),
      topics: _sorted(topics),
      emotions: _sorted(emotions),
      expenseCount: expenseCount,
      expenseTotal: expenseTotal,
      subnotes: subnotes,
    );
  }

  static Map<String, int> _sorted(Map<String, int> values) {
    final entries = values.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return Map.fromEntries(entries);
  }
}

class PersonalInsight {
  const PersonalInsight({
    required this.id,
    required this.icon,
    required this.title,
    required this.message,
    required this.evidence,
  });

  final String id;
  final IconData icon;
  final String title;
  final String message;
  final String evidence;

  static List<PersonalInsight> fromEntries(
    List<MemoryEntry> entries,
    InsightStatistics statistics,
  ) {
    final insights = <PersonalInsight>[];
    final combined = entries.map((entry) => entry.text.toLowerCase()).join(' ');
    final tiredCount = entries
        .where(
          (entry) =>
              entry.text.toLowerCase().contains('sueño') ||
              entry.text.toLowerCase().contains('cansad'),
        )
        .length;
    if (tiredCount > 0) {
      insights.add(
        PersonalInsight(
          id: 'rest-${entries.length}-$tiredCount',
          icon: Icons.bedtime_outlined,
          title: 'Observa tu descanso',
          message:
              'Anotar tus horas de sueño puede ayudarte a entender cuándo aparece el cansancio.',
          evidence:
              'Mencionaste sueño o cansancio en $tiredCount ${tiredCount == 1 ? 'nota' : 'notas'} de este periodo.',
        ),
      );
    }
    final exerciseCount = entries
        .where(
          (entry) =>
              entry.text.toLowerCase().contains('gimnasio') ||
              entry.text.toLowerCase().contains('entren'),
        )
        .length;
    if (exerciseCount > 0) {
      insights.add(
        PersonalInsight(
          id: 'exercise-${entries.length}-$exerciseCount',
          icon: Icons.fitness_center_outlined,
          title: 'Registra cómo terminas',
          message:
              'Además de la actividad, anota energía y estado de ánimo para descubrir qué rutinas te funcionan mejor.',
          evidence:
              'Registraste actividad física en $exerciseCount ${exerciseCount == 1 ? 'ocasión' : 'ocasiones'}.',
        ),
      );
    }
    if (statistics.expenseCount > 0) {
      insights.add(
        PersonalInsight(
          id: 'expenses-${entries.length}-${statistics.expenseCount}',
          icon: Icons.account_balance_wallet_outlined,
          title: 'Revisa tus gastos mencionados',
          message:
              'Comprueba que los montos detectados sean correctos antes de usarlos para tomar decisiones.',
          evidence:
              'Se detectaron ${statistics.expenseCount} gastos por aproximadamente \$${statistics.expenseTotal.toStringAsFixed(0)}.',
        ),
      );
    }
    if (statistics.people.isNotEmpty) {
      final person = statistics.people.entries.first;
      insights.add(
        PersonalInsight(
          id: 'person-${person.key}-${person.value}',
          icon: Icons.forum_outlined,
          title: 'Una relación presente',
          message:
              'Quizá valga la pena añadir contexto sobre cómo te hicieron sentir esas interacciones.',
          evidence:
              '${person.key} aparece en ${person.value} ${person.value == 1 ? 'recuerdo' : 'recuerdos'} del periodo.',
        ),
      );
    }
    if (insights.isEmpty && combined.isNotEmpty) {
      insights.add(
        PersonalInsight(
          id: 'context-${entries.length}-${statistics.subnotes}',
          icon: Icons.edit_note_rounded,
          title: 'Sigue completando el contexto',
          message:
              'Las respuestas de seguimiento permiten encontrar patrones más precisos sin asumir información.',
          evidence:
              'Tienes ${entries.length} ${entries.length == 1 ? 'nota' : 'notas'} y ${statistics.subnotes} subnotas en este periodo.',
        ),
      );
    }
    return insights.take(4).toList();
  }
}

class _PeriodSummary extends StatelessWidget {
  const _PeriodSummary({required this.entries, required this.statistics});

  final List<MemoryEntry> entries;
  final InsightStatistics statistics;

  @override
  Widget build(BuildContext context) {
    final latestSummary = entries
        .map((entry) => entry.analysis?.summary ?? '')
        .firstWhere((summary) => summary.isNotEmpty, orElse: () => '');
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFF211F2C),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.auto_awesome, color: Color(0xFFC7BEFF)),
          const SizedBox(height: 24),
          Text(
            '${entries.length} ${entries.length == 1 ? 'momento registrado' : 'momentos registrados'}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            latestSummary.isEmpty
                ? 'Tu resumen crecerá conforme añadas contexto y respondas preguntas.'
                : 'El recuerdo más reciente: $latestSummary',
            style: const TextStyle(color: Color(0xFFD8D5E2), height: 1.45),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.value,
    required this.label,
    required this.icon,
  });

  final String value;
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE4E1DB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 19, color: const Color(0xFF6656D9)),
          const SizedBox(height: 13),
          Text(
            value,
            maxLines: 1,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          Text(
            label,
            style: const TextStyle(color: Color(0xFF77736C), fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _InsightCard extends StatelessWidget {
  const _InsightCard({
    required this.insight,
    required this.feedback,
    required this.onFeedback,
  });

  final PersonalInsight insight;
  final bool? feedback;
  final ValueChanged<bool> onFeedback;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4E1DB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(insight.icon, color: const Color(0xFF6656D9)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  insight.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(insight.message, style: const TextStyle(height: 1.4)),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(
              color: const Color(0xFFF4F2ED),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Por qué: ${insight.evidence}',
              style: const TextStyle(
                color: Color(0xFF68635B),
                fontSize: 12,
                height: 1.35,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              IconButton(
                tooltip: 'No es útil',
                onPressed: () => onFeedback(false),
                icon: Icon(
                  feedback == false
                      ? Icons.thumb_down_alt
                      : Icons.thumb_down_alt_outlined,
                  size: 19,
                ),
              ),
              IconButton(
                tooltip: 'Es útil',
                onPressed: () => onFeedback(true),
                icon: Icon(
                  feedback == true
                      ? Icons.thumb_up_alt
                      : Icons.thumb_up_alt_outlined,
                  size: 19,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EmptyInsights extends StatelessWidget {
  const _EmptyInsights();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.auto_awesome_outlined,
              size: 45,
              color: Color(0xFF6656D9),
            ),
            SizedBox(height: 18),
            Text(
              'Sin recuerdos en este periodo',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            SizedBox(height: 8),
            Text(
              'Prueba otro periodo o registra un nuevo momento.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF77736C)),
            ),
          ],
        ),
      ),
    );
  }
}
