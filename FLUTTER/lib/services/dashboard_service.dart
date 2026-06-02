import 'api_service.dart';

class DashboardService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> fetchDashboardStats() async {
    try {
      final response = await _apiService.client.get('/dashboard');
      return response.data;
    } catch (e) {
      throw Exception('Failed to load dashboard stats');
    }
  }
}
