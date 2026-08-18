import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_service.dart';
import 'data_cache_service.dart';
import 'websocket_service.dart';

class AuthService {
  final ApiService _apiService = ApiService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _apiService.client.post('/login', data: {
        'email': email,
        'password': password,
      });

      final data = response.data;
      if (data is! Map<String, dynamic>) {
        throw Exception('Unexpected response from server');
      }
      final token = data['access_token'];
      if (token is String) {
        await _storage.write(key: 'auth_token', value: token);
        // Connect WebSocket after successful login
        WebSocketService.instance.connect(token).ignore();
      }

      return data;
    } on DioException {
      // Let the UI turn this into a friendly, localized message.
      rethrow;
    }
  }

  Future<void> logout({bool forceRefresh = false}) async {
    try {
      await _apiService.client.post('/logout');
    } catch (e) {
      // Ignore logout errors
    } finally {
      // Disconnect WebSocket before clearing the token
      await WebSocketService.instance.disconnect();
      await _storage.delete(key: 'auth_token');
      DataCacheService.instance.invalidateAll();
    }
  }

  Future<bool> isLoggedIn({bool forceRefresh = false}) async {
    final token = await _storage.read(key: 'auth_token');
    return token != null;
  }
}
