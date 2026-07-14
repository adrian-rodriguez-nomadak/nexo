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
}) {
  throw UnsupportedError('HTTP transport is not available on this platform.');
}
