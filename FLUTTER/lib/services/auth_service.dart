import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_service.dart';

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
      }

      return data;
    } on DioException {
      // Let the UI turn this into a friendly, localized message.
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _apiService.client.post('/logout');
    } catch (e) {
      // Ignore logout errors
    } finally {
      await _storage.delete(key: 'auth_token');
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'auth_token');
    return token != null;
  }
}
