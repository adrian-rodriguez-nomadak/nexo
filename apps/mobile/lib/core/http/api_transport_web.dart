// This adapter is compiled exclusively on Flutter web through a conditional
// import. `dart:html` remains the browser transport until the API client is
// migrated to package:web.
// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:html' as html;

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
  final request = await html.HttpRequest.request(
    uri.toString(),
    method: method,
    requestHeaders: headers,
    sendData: body,
  ).timeout(timeout);

  return ApiTransportResponse(
    statusCode: request.status ?? 0,
    body: request.responseText ?? '',
  );
}
