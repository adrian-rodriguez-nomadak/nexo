import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../application/inbox_providers.dart';
import '../domain/models/interpreted_action.dart';
import '../../../shared/presentation/widgets/app_back_button.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../../../shared/presentation/widgets/quick_action_button.dart';
import '../../../shared/presentation/widgets/section_header.dart';
import '../../../shared/presentation/widgets/summary_chip.dart';
import '../../calendar/presentation/widgets/create_event_sheet.dart';
import '../../calendar/presentation/widgets/create_reminder_sheet.dart';
import '../../debts/presentation/widgets/create_debt_from_debts_sheet.dart';
import '../../finances/presentation/widgets/create_expense_sheet.dart';
import 'models/inbox_interpretation.dart';
import 'widgets/interpreted_result_card.dart';

class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key});

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  final _controller = TextEditingController();
  InboxInterpretation? _result;
  bool _isInterpreting = false;

  static const _suggestions = [
    'Gasté 180 en comida',
    'Recuérdame pagar el gym',
    'Me deben 500',
    'Cita dental viernes 11 AM',
  ];

  static const _recentCaptures = [
    _RecentCapture(
      title: 'Gasto en comida',
      detail: r'$180',
      icon: Icons.restaurant_rounded,
      color: AppColors.finance,
    ),
    _RecentCapture(
      title: 'Pago gym',
      detail: 'Recordatorio',
      icon: Icons.notifications_active_rounded,
      color: AppColors.task,
    ),
    _RecentCapture(
      title: 'Spotify',
      detail: 'Suscripción',
      icon: Icons.subscriptions_rounded,
      color: AppColors.subscription,
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _interpret([String? text]) async {
    final value = (text ?? _controller.text).trim();
    if (value.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Escribe algo para interpretar')),
      );
      return;
    }

    if (text != null) {
      _controller.text = text;
      _controller.selection = TextSelection.collapsed(offset: text.length);
    }

    setState(() => _isInterpreting = true);

    try {
      final interpreted = await ref.read(
        interpretInboxTextProvider(value).future,
      );
      if (!mounted) return;
      setState(() {
        _result = _fromInterpretedAction(interpreted, value);
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _result = _buildInterpretation(value);
      });
    } finally {
      if (mounted) setState(() => _isInterpreting = false);
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  void _continueWithResult() {
    final result = _result;
    if (result == null) return;

    switch (result.type) {
      case 'expense':
        CreateExpenseSheet.show(
          context: context,
          onSave: (_) => _showSnackBar('Gasto simulado guardado'),
        );
        return;
      case 'reminder':
        CreateReminderSheet.show(
          context: context,
          onSave: (_) => _showSnackBar('Recordatorio simulado guardado'),
        );
        return;
      case 'debtInFavor':
        CreateDebtFromDebtsSheet.show(
          context: context,
          initialType: 'Me deben',
          onSave: (_) => _showSnackBar('Deuda simulada guardada'),
        );
        return;
      case 'event':
        CreateEventSheet.show(
          context: context,
          onSave: (_) => _showSnackBar('Evento simulado guardado'),
        );
        return;
      default:
        _showSnackBar('Acción simulada guardada');
    }
  }

  void _cancelResult() {
    setState(() {
      _result = null;
      _controller.clear();
    });
  }

  InboxInterpretation _buildInterpretation(String text) {
    final normalized = text.toLowerCase();

    if (normalized.contains('gasté') || normalized.contains('gaste')) {
      return const InboxInterpretation(
        type: 'expense',
        detectedLabel: 'un gasto',
        title: 'Comida',
        secondaryLabel: 'Monto',
        secondary: r'$180',
        category: 'Alimentos',
        preview: 'Lo mandaría a Finanzas como gasto del día.',
        icon: Icons.receipt_long_rounded,
        color: AppColors.finance,
      );
    }

    if (normalized.contains('recuérdame') ||
        normalized.contains('recuerdame') ||
        normalized.contains('recordar')) {
      return const InboxInterpretation(
        type: 'reminder',
        detectedLabel: 'un recordatorio',
        title: 'Pagar Gym',
        secondaryLabel: 'Fecha',
        secondary: '15 julio',
        category: 'Salud/Gym',
        preview: 'Lo dejaría como pendiente con aviso próximo.',
        icon: Icons.notifications_active_rounded,
        color: AppColors.task,
      );
    }

    if (normalized.contains('me deben')) {
      return const InboxInterpretation(
        type: 'debtInFavor',
        detectedLabel: 'una deuda a favor',
        title: 'Cobro pendiente',
        secondaryLabel: 'Monto',
        secondary: r'$500',
        category: 'Deudas por cobrar',
        preview: 'Lo registraría para seguimiento en Finanzas.',
        icon: Icons.savings_rounded,
        color: AppColors.debt,
      );
    }

    if (normalized.contains('cita') || normalized.contains('evento')) {
      return const InboxInterpretation(
        type: 'event',
        detectedLabel: 'un evento',
        title: 'Cita dental',
        secondaryLabel: 'Fecha',
        secondary: 'Viernes, 11:00 AM',
        category: 'Salud',
        preview: 'Lo agregaría al Calendario.',
        icon: Icons.calendar_today_rounded,
        color: AppColors.calendar,
      );
    }

    return const InboxInterpretation(
      type: 'note',
      detectedLabel: 'una nota rápida',
      title: 'Captura sin clasificar',
      secondaryLabel: 'Estado',
      secondary: 'Pendiente de revisar',
      category: 'Inbox',
      preview: 'Lo dejaría guardado en Inbox para clasificar después.',
      icon: Icons.inbox_rounded,
      color: AppColors.accent,
    );
  }

  InboxInterpretation _fromInterpretedAction(
    InterpretedAction action,
    String rawText,
  ) {
    final amount = action.payload['amount'];
    final secondaryAmount = amount == null ? 'Pendiente' : '\$$amount';

    final base = switch (action.intent) {
      'create_expense' || 'expense' => InboxInterpretation(
        type: 'expense',
        detectedLabel: 'un gasto',
        title: action.payload['description']?.toString() ?? 'Gasto',
        secondaryLabel: 'Monto',
        secondary: secondaryAmount,
        category: 'Finanzas',
        preview: action.preview,
        icon: Icons.receipt_long_rounded,
        color: AppColors.finance,
      ),
      'create_reminder' || 'reminder' => InboxInterpretation(
        type: 'reminder',
        detectedLabel: 'un recordatorio',
        title: action.payload['title']?.toString() ?? rawText,
        secondaryLabel: 'Fecha',
        secondary: 'Pendiente',
        category: 'Recordatorios',
        preview: action.preview,
        icon: Icons.notifications_active_rounded,
        color: AppColors.task,
      ),
      'create_debt' || 'debtInFavor' => InboxInterpretation(
        type: 'debtInFavor',
        detectedLabel: 'una deuda a favor',
        title: 'Cobro pendiente',
        secondaryLabel: 'Monto',
        secondary: secondaryAmount,
        category: 'Deudas por cobrar',
        preview: action.preview,
        icon: Icons.savings_rounded,
        color: AppColors.debt,
      ),
      'create_event' || 'event' => InboxInterpretation(
        type: 'event',
        detectedLabel: 'un evento',
        title: action.payload['title']?.toString() ?? rawText,
        secondaryLabel: 'Fecha',
        secondary: 'Pendiente',
        category: 'Calendario',
        preview: action.preview,
        icon: Icons.calendar_today_rounded,
        color: AppColors.calendar,
      ),
      _ => InboxInterpretation(
        type: 'note',
        detectedLabel: 'una nota rápida',
        title: 'Captura sin clasificar',
        secondaryLabel: 'Estado',
        secondary: 'Pendiente de revisar',
        category: 'Inbox',
        preview: action.preview,
        icon: Icons.inbox_rounded,
        color: AppColors.accent,
      ),
    };
    return InboxInterpretation(
      type: base.type,
      detectedLabel: base.detectedLabel,
      title: action.title.isEmpty ? base.title : action.title,
      secondaryLabel: base.secondaryLabel,
      secondary: base.secondary,
      category: action.payload['category']?.toString() ?? base.category,
      preview: base.preview,
      icon: base.icon,
      color: base.color,
      confidence: action.confidence,
      source: action.source,
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.lg,
            AppSpacing.screenPadding,
            150,
          ),
          children: [
            Row(
              children: [
                const AppBackButton(),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Inbox inteligente', style: textTheme.headlineLarge),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Registra cualquier cosa sin pensar dónde va.',
                        style: textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const ModuleBadge(
                  icon: Icons.auto_awesome_rounded,
                  color: AppColors.primaryDark,
                  backgroundColor: AppColors.primary,
                  size: 48,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            AppCard(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('¿Qué quieres registrar?', style: textTheme.titleLarge),
                  const SizedBox(height: AppSpacing.md),
                  TextField(
                    controller: _controller,
                    minLines: 4,
                    maxLines: 6,
                    textInputAction: TextInputAction.newline,
                    decoration: const InputDecoration(
                      hintText: 'Ej. gasté 180 en comida hoy',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  ElevatedButton.icon(
                    onPressed: _isInterpreting ? null : () => _interpret(),
                    icon: _isInterpreting
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.auto_awesome_rounded),
                    label: Text(
                      _isInterpreting ? 'Interpretando' : 'Interpretar',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Sugerencias rápidas'),
            const SizedBox(height: AppSpacing.md),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: _suggestions
                  .map(
                    (suggestion) => QuickActionButton(
                      icon: Icons.add_rounded,
                      label: suggestion,
                      onTap: () => _interpret(suggestion),
                    ),
                  )
                  .toList(),
            ),
            if (_result != null) ...[
              const SizedBox(height: AppSpacing.xxl),
              InterpretedResultCard(
                result: _result!,
                onSave: _continueWithResult,
                onEdit: () => _showSnackBar('Edición simulada'),
                onCancel: _cancelResult,
              ),
            ],
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'Capturas recientes'),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Column(
                children: [
                  for (final capture in _recentCaptures) ...[
                    _RecentCaptureTile(capture: capture),
                    if (capture != _recentCaptures.last)
                      const SizedBox(height: AppSpacing.lg),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: const [
                SummaryChip(
                  label: 'UI prototipo',
                  icon: Icons.visibility_rounded,
                  color: AppColors.info,
                ),
                SummaryChip(
                  label: 'Sin datos reales',
                  icon: Icons.lock_outline_rounded,
                  color: AppColors.textMuted,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _RecentCapture {
  const _RecentCapture({
    required this.title,
    required this.detail,
    required this.icon,
    required this.color,
  });

  final String title;
  final String detail;
  final IconData icon;
  final Color color;
}

class _RecentCaptureTile extends StatelessWidget {
  const _RecentCaptureTile({required this.capture});

  final _RecentCapture capture;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        ModuleBadge(icon: capture.icon, color: capture.color, size: 38),
        const SizedBox(width: AppSpacing.md),
        Expanded(child: Text(capture.title, style: textTheme.titleMedium)),
        Text(capture.detail, style: textTheme.bodyMedium),
      ],
    );
  }
}
