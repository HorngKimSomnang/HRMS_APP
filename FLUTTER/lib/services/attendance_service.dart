import 'package:dio/dio.dart';
import '../core/error_utils.dart';
import 'api_service.dart';

class AttendanceService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> clockIn(
    double lat,
    double lng, {
    String address = 'Unknown',
    double? accuracy,
  }) async {
    try {
      final response = await _apiService.client.post('/attendance/clock-in', data: {
        'latitude': lat,
        'longitude': lng,
        'address': address,
        if (accuracy != null) 'accuracy': accuracy,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(serverMessage(e, 'Clock in failed'));
    }
  }

  Future<void> clockOut(
    double lat,
    double lng, {
    String address = 'Unknown',
    double? accuracy,
  }) async {
    try {
      await _apiService.client.post('/attendance/clock-out', data: {
        'latitude': lat,
        'longitude': lng,
        'address': address,
        if (accuracy != null) 'accuracy': accuracy,
      });
    } on DioException catch (e) {
      throw Exception(serverMessage(e, 'Clock out failed'));
    }
  }

  Future<void> undoClockOut() async {
    try {
      await _apiService.client.post('/attendance/undo-clock-out');
    } on DioException catch (e) {
      throw Exception(serverMessage(e, 'Failed to undo clock out'));
    }
  }

  Future<void> submitLateReason(String reason) async {
    try {
      await _apiService.client.post('/attendance/late-reason', data: {
        'late_reason': reason,
      });
    } on DioException catch (e) {
      throw Exception(serverMessage(e, 'Failed to submit late reason'));
    }
  }

  Future<Map<String, dynamic>?> fetchToday() async {
    try {
      final response = await _apiService.client.get('/attendance/today');
      final data = response.data;
      if (data is Map && data['data'] != null) return Map<String, dynamic>.from(data['data']);
      return null;
    } on DioException catch (_) {
      return null;
    }
  }

  Future<List<dynamic>> fetchAttendanceHistory() async {
    try {
      final response = await _apiService.client.get('/attendance/history');
      final data = response.data;
      if (data is Map && data['data'] is List) return data['data'];
      if (data is List) return data;
      return [];
    } on DioException catch (_) {
      return [];
    }
  }
}
