import 'package:dio/dio.dart';
import 'api_service.dart';

class AttendanceService {
  final ApiService _apiService = ApiService();

  Future<void> clockIn(double lat, double lng) async {
    try {
      await _apiService.client.post('/attendance/clock-in', data: {
        'latitude': lat,
        'longitude': lng,
        'address': 'Mobile GPS' // Implement proper geocoding later if needed
      });
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Clock in failed');
    }
  }

  Future<void> clockOut(double lat, double lng) async {
    try {
      await _apiService.client.post('/attendance/clock-out', data: {
        'latitude': lat,
        'longitude': lng,
        'address': 'Mobile GPS'
      });
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Clock out failed');
    }
  }
  Future<List<dynamic>> fetchAttendanceHistory() async {
    try {
      final response = await _apiService.client.get('/attendance/history');
      return response.data['data'];
    } on DioException catch (_) {
      return [];
    }
  }
}
