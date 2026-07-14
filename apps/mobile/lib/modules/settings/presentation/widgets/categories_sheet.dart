import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../data/categories_service.dart';

class CategoriesSheet extends StatefulWidget {
  const CategoriesSheet({super.key, required this.service});

  final CategoriesService service;

  static Future<void> show({
    required BuildContext context,
    required CategoriesService service,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => CategoriesSheet(service: service),
  );

  @override
  State<CategoriesSheet> createState() => _CategoriesSheetState();
}

class _CategoriesSheetState extends State<CategoriesSheet> {
  final _controller = TextEditingController();
  List<FinanceCategory>? _categories;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final categories = await widget.service.getAll();
    if (mounted) setState(() => _categories = categories);
  }

  Future<void> _add() async {
    final name = _controller.text.trim();
    if (name.isEmpty) return;
    await widget.service.add(name);
    _controller.clear();
    await _reload();
  }

  Future<void> _delete(FinanceCategory category) async {
    await widget.service.delete(category.id);
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          AppSpacing.screenPadding,
          0,
          AppSpacing.screenPadding,
          MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Categorías',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Organiza gastos y presupuestos con tus propias categorías.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(
                      labelText: 'Nueva categoría',
                      hintText: 'Ej. Mascotas',
                    ),
                    onSubmitted: (_) => _add(),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                IconButton.filled(
                  tooltip: 'Agregar categoría',
                  onPressed: _add,
                  icon: const Icon(Icons.add_rounded),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            if (_categories == null)
              const Center(child: CircularProgressIndicator())
            else
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 360),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _categories!.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final category = _categories![index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(
                        Icons.label_outline_rounded,
                        color: AppColors.primaryDark,
                      ),
                      title: Text(category.name),
                      trailing: IconButton(
                        tooltip: 'Eliminar',
                        onPressed: () => _delete(category),
                        icon: const Icon(Icons.delete_outline_rounded),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
