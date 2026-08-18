import 'api_service.dart';

class OvertimeService {
  final ApiService _apiService = ApiService();

  Future<List<dynamic>> getOvertimes({bool forceRefresh = false}) async {
    final response = await ApiService.instance.cachedGet('/overtimes', forceRefresh: forceRefresh);
    return response.data;
  }

  Future<void> requestOvertime(Map<String, dynamic> data) async {
    await _apiService.client.post('/overtimes', data: data);
  }
}
