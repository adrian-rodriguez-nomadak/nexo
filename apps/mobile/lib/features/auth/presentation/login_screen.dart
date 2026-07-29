import 'package:flutter/material.dart';

import '../../../app/theme/nexo_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({required this.onSubmit, super.key});

  final Future<void> Function({
    required String email,
    required String password,
    String? displayName,
  })
  onSubmit;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isRegister = false;
  bool _showPassword = false;
  bool _isSubmitting = false;
  bool _acceptedPrivacy = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_isRegister && !_acceptedPrivacy) {
      setState(() => _error = 'Confirma el uso de tu espacio privado.');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.onSubmit(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        displayName: _isRegister ? _nameController.text.trim() : null,
      );
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _switchMode() {
    setState(() {
      _isRegister = !_isRegister;
      _error = null;
      _acceptedPrivacy = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.hub_rounded, color: NexoColors.lime),
                        SizedBox(width: 10),
                        Text(
                          'NEXO',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 56),
                    Text(
                      _isRegister
                          ? 'Crea tu espacio personal'
                          : 'Bienvenido de vuelta',
                      style: Theme.of(context).textTheme.displaySmall,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _isRegister
                          ? 'Una cuenta para conectar todo lo importante.'
                          : 'Tus datos de la web también están aquí.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 30),
                    if (_isRegister) ...[
                      TextFormField(
                        key: const Key('auth-name'),
                        controller: _nameController,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.name],
                        decoration: const InputDecoration(labelText: 'Nombre'),
                        validator: (value) => (value?.trim().length ?? 0) < 2
                            ? 'Escribe tu nombre.'
                            : null,
                      ),
                      const SizedBox(height: 12),
                    ],
                    TextFormField(
                      key: const Key('auth-email'),
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      autocorrect: false,
                      decoration: const InputDecoration(
                        labelText: 'Correo electrónico',
                      ),
                      validator: (value) => !(value ?? '').contains('@')
                          ? 'Escribe un correo válido.'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      key: const Key('auth-password'),
                      controller: _passwordController,
                      obscureText: !_showPassword,
                      autofillHints: [
                        _isRegister
                            ? AutofillHints.newPassword
                            : AutofillHints.password,
                      ],
                      decoration: InputDecoration(
                        labelText: 'Contraseña',
                        suffixIcon: IconButton(
                          onPressed: () =>
                              setState(() => _showPassword = !_showPassword),
                          icon: Icon(
                            _showPassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                          ),
                        ),
                      ),
                      validator: (value) {
                        final password = value ?? '';
                        if (password.length < 8) {
                          return 'Usa al menos 8 caracteres.';
                        }
                        if (_isRegister &&
                            (!RegExp('[A-Za-z]').hasMatch(password) ||
                                !RegExp('[0-9]').hasMatch(password) ||
                                password.contains(RegExp(r'\s')))) {
                          return 'Incluye letras y números, sin espacios.';
                        }
                        return null;
                      },
                    ),
                    if (_isRegister) ...[
                      const SizedBox(height: 12),
                      CheckboxListTile(
                        value: _acceptedPrivacy,
                        onChanged: (value) =>
                            setState(() => _acceptedPrivacy = value ?? false),
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        title: const Text(
                          'Entiendo que Nexo almacena sólo los datos que decida registrar.',
                        ),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        _error!,
                        key: const Key('auth-error'),
                        style: const TextStyle(color: Color(0xFFFF7F96)),
                      ),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(
                      key: const Key('auth-submit'),
                      onPressed: _isSubmitting ? null : _submit,
                      child: Text(
                        _isSubmitting
                            ? 'Conectando…'
                            : _isRegister
                            ? 'Crear mi cuenta'
                            : 'Entrar a Nexo',
                      ),
                    ),
                    TextButton(
                      onPressed: _isSubmitting ? null : _switchMode,
                      child: Text(
                        _isRegister ? 'Ya tengo cuenta' : 'Crear una cuenta',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
