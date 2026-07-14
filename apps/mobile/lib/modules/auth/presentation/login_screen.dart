import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../shared/presentation/widgets/app_card.dart';
import '../../../shared/presentation/widgets/app_text_field.dart';
import '../../../shared/presentation/widgets/module_badge.dart';
import '../application/auth_providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _registering = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final name = _nameController.text.trim();
    if (email.isEmpty ||
        password.length < 8 ||
        (_registering && name.isEmpty)) {
      _message('Completa los campos. La contraseña requiere 8 caracteres.');
      return;
    }
    final controller = ref.read(authSessionProvider.notifier);
    final success = _registering
        ? await controller.register(name, email, password)
        : await controller.login(email, password);
    if (!mounted) return;
    if (success) {
      context.go('/');
    } else {
      final error = ref.read(authSessionProvider).error;
      _message(error?.toString() ?? 'No se pudo iniciar sesión');
    }
  }

  void _message(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authSessionProvider);
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            const SizedBox(height: AppSpacing.xl),
            const Align(
              alignment: Alignment.centerLeft,
              child: ModuleBadge(
                icon: Icons.hub_rounded,
                color: AppColors.primaryDark,
                size: 58,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              _registering ? 'Crea tu cuenta' : 'Bienvenido a Nexo',
              style: textTheme.displayMedium,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              _registering
                  ? 'Tus datos locales podrán vincularse a tu cuenta.'
                  : 'Accede para respaldar y sincronizar tus datos.',
              style: textTheme.bodyLarge,
            ),
            const SizedBox(height: AppSpacing.xxl),
            AppCard(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                children: [
                  if (_registering) ...[
                    AppTextField(
                      label: 'Nombre',
                      hint: 'Tu nombre',
                      controller: _nameController,
                      prefixIcon: Icons.person_rounded,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                  ],
                  AppTextField(
                    label: 'Correo',
                    hint: 'correo@ejemplo.com',
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    prefixIcon: Icons.email_rounded,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AppTextField(
                    label: 'Contraseña',
                    hint: 'Mínimo 8 caracteres',
                    controller: _passwordController,
                    obscureText: true,
                    prefixIcon: Icons.lock_rounded,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: auth.isLoading ? null : _submit,
                      child: auth.isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(
                              _registering ? 'Crear cuenta' : 'Iniciar sesión',
                            ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            TextButton(
              onPressed: auth.isLoading
                  ? null
                  : () => setState(() => _registering = !_registering),
              child: Text(
                _registering ? 'Ya tengo una cuenta' : 'Crear una cuenta',
              ),
            ),
            TextButton(
              onPressed: () => context.go('/'),
              child: const Text('Continuar solo en este dispositivo'),
            ),
          ],
        ),
      ),
    );
  }
}
