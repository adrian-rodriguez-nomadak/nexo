import 'dart:convert';
import 'dart:io';

class ApiTransportResponse {
  const ApiTransportResponse({required this.statusCode, required this.body});

  final int statusCode;
  final String body;
}

Future<ApiTransportResponse> sendApiRequest({
  required String method,
  required Uri uri,
  required Duration timeout,
  required Map<String, String> headers,
  String? body,
}) async {
  final client = HttpClient()..connectionTimeout = timeout;
  try {
    final request = await client.openUrl(method, uri).timeout(timeout);
    headers.forEach(request.headers.set);
    if (body != null) {
      request.write(body);
    }
    final response = await request.close().timeout(timeout);
    final responseBody = await response.transform(utf8.decoder).join();
    return ApiTransportResponse(
      statusCode: response.statusCode,
      body: responseBody,
    );
  } finally {
    client.close(force: true);
  }
}
