import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/core/config/api_config.dart';
import 'package:nexo_mobile/core/http/api_client.dart';

void main() {
  test('uses the deployed Render API by default', () {
    const config = ApiConfig();

    expect(config.baseUrl, ApiConfig.productionBaseUrl);
    expect(
      const ApiClient().uri('/health').toString(),
      'https://nexo-api-2gbp.onrender.com/api/health',
    );
  });

  test('allows overriding the API URL', () {
    const client = ApiClient(
      config: ApiConfig(baseUrl: 'http://localhost:3000/api'),
    );

    expect(client.uri('/tasks').toString(), 'http://localhost:3000/api/tasks');
  });
}
