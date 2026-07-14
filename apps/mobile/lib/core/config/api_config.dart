class ApiConfig {
  const ApiConfig({
    this.baseUrl = localBaseUrl,
    this.timeout = const Duration(seconds: 15),
  });

  static const localBaseUrl = 'http://localhost:3000/api';
  static const androidEmulatorBaseUrl = 'http://10.0.2.2:3000/api';

  // Change to androidEmulatorBaseUrl when running on the Android emulator.
  static const developmentBaseUrl = localBaseUrl;

  final String baseUrl;
  final Duration timeout;
}
