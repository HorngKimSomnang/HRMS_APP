import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';

import '../l10n/app_localizations.dart';

/// Converts any exception into a short, user-friendly, localized message.
/// Never shows raw exception text (stack traces, DioException dumps, URLs)
/// to the user.
String friendlyError(BuildContext context, Object e) {
  final l10n = AppLocalizations.of(context)!;

  if (e is DioException) {
    final status = e.response?.statusCode;
    final data = e.response?.data;
    // A real reply from our API with a human message (validation etc.).
    if (status != null && status < 500 && data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    // Timeouts, no network, 5xx, bad gateway... -> connection message.
    return l10n.checkYourInternet;
  }

  // Intentional app-level messages: `throw Exception('...')`.
  final s = e.toString();
  if (s.startsWith('Exception: ')) return s.substring('Exception: '.length);

  return l10n.somethingWentWrong;
}

/// Extracts the server's JSON 'message' from a [DioException], or returns
/// [fallback]. Never crashes when the body is HTML/plain text (e.g. a
/// proxy 502 page). For use in services that have no BuildContext.
String serverMessage(DioException e, String fallback) {
  final data = e.response?.data;
  if (data is Map && data['message'] is String) return data['message'] as String;
  return fallback;
}
