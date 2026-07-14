class ApiConfig {
  const ApiConfig({
    this.baseUrl = defaultBaseUrl,
    this.timeout = const Duration(seconds: 15),
  });

  static const localBaseUrl = 'http://localhost:3000/api';
  static const androidEmulatorBaseUrl = 'http://10.0.2.2:3000/api';
  static const productionBaseUrl = 'https://nexo-api-2gbp.onrender.com/api';

  static const defaultBaseUrl = String.fromEnvironment(
    'NEXO_API_BASE_URL',
    defaultValue: productionBaseUrl,
  );

  final String baseUrl;
  final Duration timeout;
}
