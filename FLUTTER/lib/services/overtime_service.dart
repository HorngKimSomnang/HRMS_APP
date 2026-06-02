import 'api_service.dart';

class OvertimeService {
  final ApiService _apiService = ApiService();

  Future<List<dynamic>> getOvertimes() async {
    final response = await _apiService.client.get('/overtimes');
    return response.data;
  }

  Future<void> requestOvertime(Map<String, dynamic> data) async {
    await _apiService.client.post('/overtimes', data: data);
  }
}
