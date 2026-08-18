import 'api_service.dart';

class DashboardService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> fetchDashboardStats({bool forceRefresh = false}) async {
    try {
      final response = await ApiService.instance.cachedGet('/dashboard', forceRefresh: forceRefresh);
      return response.data;
    } catch (e) {
      throw Exception('Failed to load dashboard stats');
    }
  }
}
