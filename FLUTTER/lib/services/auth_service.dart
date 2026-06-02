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

      final token = response.data['access_token'];
      if (token != null) {
        await _storage.write(key: 'auth_token', value: token);
      }
      
      return response.data;
    } on DioException catch (e) {
      if (e.response != null) {
        throw Exception(e.response!.data['message'] ?? 'Login failed');
      } else {
        throw Exception('Network error: ${e.message} \n ${e.error}');
      }
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
