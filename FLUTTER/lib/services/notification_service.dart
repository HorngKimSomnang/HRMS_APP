import 'api_service.dart';

class NotificationService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> fetchNotifications({bool forceRefresh = false}) async {
    final response = await ApiService.instance.cachedGet('/notifications', forceRefresh: forceRefresh);
    return response.data;
  }

  Future<String> fetchNotificationVersion({bool forceRefresh = false}) async {
    final response = await ApiService.instance.cachedGet(
      '/data-versions',
      queryParameters: {'resources': 'notifications'},
      forceRefresh: forceRefresh
    );
    final data = Map<String, dynamic>.from(response.data as Map);
    final resources = Map<String, dynamic>.from(data['resources'] as Map? ?? {});
    return resources['notifications']?.toString() ?? '0';
  }

  Future<void> markAllAsRead({bool forceRefresh = false}) async {
    await _apiService.client.post('/notifications/mark-read');
  }

  Future<void> deleteNotification(String id) async {
    await _apiService.client.delete('/notifications/$id');
  }

  Future<void> deleteAllNotifications({bool forceRefresh = false}) async {
    await _apiService.client.delete('/notifications/clear-all');
  }
}
