import 'package:flutter/material.dart';

import '../../auth/data/auth_repository.dart';
import '../../auth/domain/auth_session.dart';

class MemoryAuthController extends ChangeNotifier {
  MemoryAuthController({this.repository = const AuthRepository()});

  final AuthRepository repository;
  AuthSession? session;
  bool loading = true;
  String? error;

  Future<void> initialize() async {
    try {
      session = await repository.restore();
    } catch (_) {
      session = null;
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    return _authenticate(
      () => repository.login(email: email.trim(), password: password),
    );
  }

  Future<bool> register(String name, String email, String password) async {
    return _authenticate(
      () => repository.register(
        name: name.trim(),
        email: email.trim(),
        password: password,
      ),
    );
  }

  Future<bool> _authenticate(Future<AuthSession> Function() action) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      session = await action();
      loading = false;
      notifyListeners();
      return true;
    } catch (exception) {
      loading = false;
      final message = exception.toString().toLowerCase();
      if (message.contains('409')) {
        error = 'Este correo ya está registrado.';
      } else if (message.contains('401')) {
        error = 'Correo o contraseña incorrectos.';
      } else if (message.contains('timeout')) {
        error = 'El servidor tardó demasiado en responder.';
      } else {
        error = 'No se pudo conectar con Nexo. Intenta nuevamente.';
      }
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    loading = true;
    notifyListeners();
    await repository.logout();
    session = null;
    loading = false;
    notifyListeners();
  }
}

class MemoryAuthScope extends InheritedNotifier<MemoryAuthController> {
  const MemoryAuthScope({
    required MemoryAuthController controller,
    required super.child,
    super.key,
  }) : super(notifier: controller);

  static MemoryAuthController? maybeOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<MemoryAuthScope>()
        ?.notifier;
  }
}

class MemoryAuthGate extends StatefulWidget {
  const MemoryAuthGate({required this.child, super.key});
  final Widget child;

  @override
  State<MemoryAuthGate> createState() => _MemoryAuthGateState();
}

class _MemoryAuthGateState extends State<MemoryAuthGate> {
  late final MemoryAuthController _controller;

  @override
  void initState() {
    super.initState();
    _controller = MemoryAuthController()..addListener(_refresh);
    _controller.initialize();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_refresh)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MemoryAuthScope(
      controller: _controller,
      child: _controller.loading && _controller.session == null
          ? const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            )
          : _controller.session == null
          ? MemoryAccessScreen(controller: _controller)
          : widget.child,
    );
  }
}

class MemoryAccessScreen extends StatefulWidget {
  const MemoryAccessScreen({required this.controller, super.key});
  final MemoryAuthController controller;

  @override
  State<MemoryAccessScreen> createState() => _MemoryAccessScreenState();
}

class _MemoryAccessScreenState extends State<MemoryAccessScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _register = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate() || widget.controller.loading) return;
    if (_register) {
      await widget.controller.register(
        _name.text,
        _email.text,
        _password.text,
      );
    } else {
      await widget.controller.login(_email.text, _password.text);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      width: 62,
                      height: 62,
                      decoration: const BoxDecoration(
                        color: Color(0xFF211F2C),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.hub_rounded,
                        color: Color(0xFFC7BEFF),
                        size: 31,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      _register ? 'Crea tu memoria' : 'Bienvenido a Nexo',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -.7,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      _register
                          ? 'Tus recuerdos estarán asociados a tu cuenta.'
                          : 'Continúa donde dejaste tu historia.',
                      style: const TextStyle(
                        color: Color(0xFF77736C),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 28),
                    if (_register) ...[
                      TextFormField(
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Nombre',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        validator: (value) => (value?.trim().length ?? 0) < 2
                            ? 'Escribe tu nombre.'
                            : null,
                      ),
                      const SizedBox(height: 12),
                    ],
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      decoration: const InputDecoration(
                        labelText: 'Correo',
                        prefixIcon: Icon(Icons.mail_outline),
                      ),
                      validator: (value) {
                        final email = value?.trim() ?? '';
                        return email.contains('@')
                            ? null
                            : 'Escribe un correo válido.';
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        labelText: 'Contraseña',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          onPressed: () => setState(
                            () => _obscurePassword = !_obscurePassword,
                          ),
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                      validator: (value) => (value?.length ?? 0) < 8
                          ? 'Usa al menos ocho caracteres.'
                          : null,
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    if (widget.controller.error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        widget.controller.error!,
                        style: const TextStyle(color: Color(0xFF9E3535)),
                      ),
                    ],
                    const SizedBox(height: 18),
                    FilledButton(
                      onPressed: widget.controller.loading ? null : _submit,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Text(
                          widget.controller.loading
                              ? 'Conectando…'
                              : _register
                              ? 'Crear cuenta'
                              : 'Iniciar sesión',
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextButton(
                      onPressed: widget.controller.loading
                          ? null
                          : () => setState(() {
                              _register = !_register;
                              widget.controller.error = null;
                            }),
                      child: Text(
                        _register
                            ? 'Ya tengo una cuenta'
                            : 'Crear una cuenta nueva',
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
