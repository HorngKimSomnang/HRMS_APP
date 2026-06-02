import 'api_service.dart';

class NotificationService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> fetchNotifications() async {
    final response = await _apiService.client.get('/notifications');
    return response.data;
  }

  Future<void> markAllAsRead() async {
    await _apiService.client.post('/notifications/mark-read');
  }

  Future<void> deleteNotification(String id) async {
    await _apiService.client.delete('/notifications/$id');
  }

  Future<void> deleteAllNotifications() async {
    await _apiService.client.delete('/notifications/clear-all');
  }
}
