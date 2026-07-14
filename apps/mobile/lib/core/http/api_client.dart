import 'dart:convert';

import '../config/api_config.dart';
import 'api_transport.dart';

class ApiClientException implements Exception {
  const ApiClientException(this.message, {this.statusCode, this.errors});

  final String message;
  final int? statusCode;
  final Object? errors;

  @override
  String toString() => 'ApiClientException($statusCode): $message';
}

class ApiClient {
  const ApiClient({
    this.config = const ApiConfig(),
    this.defaultHeaders = const {'Content-Type': 'application/json'},
    this.accessToken,
    this.refreshSession,
  });

  final ApiConfig config;
  final Map<String, String> defaultHeaders;
  final Future<String?> Function()? accessToken;
  final Future<bool> Function()? refreshSession;

  Uri uri(String path, [Map<String, Object?>? queryParameters]) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final baseUri = Uri.parse(config.baseUrl);

    return baseUri.replace(
      path: '${baseUri.path}$normalizedPath',
      queryParameters: queryParameters?.map(
        (key, value) => MapEntry(key, value?.toString()),
      ),
    );
  }

  Future<Object?> get(
    String path, {
    Map<String, Object?>? queryParameters,
    Map<String, String>? headers,
  }) async {
    return _send('GET', uri(path, queryParameters), headers: headers);
  }

  Future<Object?> post(
    String path,
    Map<String, dynamic> body, {
    Map<String, String>? headers,
  }) async {
    return _send('POST', uri(path), body: body, headers: headers);
  }

  Future<Object?> patch(
    String path,
    Map<String, dynamic> body, {
    Map<String, String>? headers,
  }) async {
    return _send('PATCH', uri(path), body: body, headers: headers);
  }

  Future<Object?> delete(String path, {Map<String, String>? headers}) async {
    return _send('DELETE', uri(path), headers: headers);
  }

  Map<String, String> _headers(Map<String, String>? headers) {
    return {...defaultHeaders, ...?headers};
  }

  Future<Object?> _send(
    String method,
    Uri uri, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
    bool allowRefresh = true,
  }) async {
    final token = await accessToken?.call();
    final requestHeaders = _headers(headers);
    if (token != null && token.isNotEmpty) {
      requestHeaders['Authorization'] = 'Bearer $token';
    }
    final response = await sendApiRequest(
      method: method,
      uri: uri,
      timeout: config.timeout,
      headers: requestHeaders,
      body: body == null ? null : jsonEncode(body),
    );
    if (response.statusCode == 401 && allowRefresh && refreshSession != null) {
      final refreshed = await refreshSession!.call();
      if (refreshed) {
        return _send(
          method,
          uri,
          body: body,
          headers: headers,
          allowRefresh: false,
        );
      }
    }
    return _decodeData(response.statusCode, response.body);
  }

  Object? _decodeData(int statusCode, String responseBody) {
    final decoded = responseBody.isEmpty
        ? <String, Object?>{}
        : jsonDecode(responseBody);

    if (decoded is! Map<String, dynamic>) {
      throw ApiClientException('Invalid API response', statusCode: statusCode);
    }

    final ok = decoded['ok'] == true;
    final statusOk = statusCode >= 200 && statusCode < 300;
    if (!statusOk || !ok) {
      throw ApiClientException(
        decoded['message']?.toString() ?? 'API request failed',
        statusCode: statusCode,
        errors: decoded['errors'],
      );
    }

    return decoded['data'];
  }
}
