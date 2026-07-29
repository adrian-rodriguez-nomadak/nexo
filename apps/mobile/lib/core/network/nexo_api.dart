import 'dart:convert';

import 'package:http/http.dart' as http;

class NexoApiException implements Exception {
  const NexoApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class NexoApi {
  NexoApi({this.token, http.Client? client})
    : _client = client ?? http.Client();

  static const baseUrl = String.fromEnvironment(
    'NEXO_API_URL',
    defaultValue: 'https://nexo-api-2gbp.onrender.com',
  );

  final String? token;
  final http.Client _client;

  NexoApi authenticated(String sessionToken) =>
      NexoApi(token: sessionToken, client: _client);

  Future<Map<String, dynamic>> get(String path) => _request('GET', path);

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
  }) => _request('POST', path, body: body);

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final headers = <String, String>{
      'accept': 'application/json',
      if (body != null) 'content-type': 'application/json',
      if (token != null) 'authorization': 'Bearer $token',
    };

    try {
      final request = http.Request(method, Uri.parse('$baseUrl$normalizedPath'))
        ..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);

      final streamed = await _client
          .send(request)
          .timeout(const Duration(seconds: 35));
      final response = await http.Response.fromStream(streamed);
      final decoded = response.body.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(response.body);
      final data = decoded is Map<String, dynamic>
          ? decoded
          : <String, dynamic>{'data': decoded};

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw NexoApiException(
          data['error'] is String
              ? data['error'] as String
              : 'Nexo no pudo completar la solicitud.',
          statusCode: response.statusCode,
        );
      }
      return data;
    } on NexoApiException {
      rethrow;
    } on FormatException {
      throw const NexoApiException('Nexo recibió una respuesta no válida.');
    } catch (_) {
      throw const NexoApiException(
        'No fue posible conectar con Nexo. Revisa tu conexión.',
      );
    }
  }
}
