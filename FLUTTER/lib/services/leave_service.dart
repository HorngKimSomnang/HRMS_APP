import 'package:dio/dio.dart';
import 'api_service.dart';

class LeaveService {
  final ApiService _apiService = ApiService();

  Future<List<dynamic>> fetchLeaves() async {
    try {
      final response = await _apiService.client.get('/leaves');
      return response.data; // Laravel returns List directly
    } catch (e) {
      throw Exception('Failed to fetch leaves');
    }
  }

  Future<List<dynamic>> fetchLeaveTypes() async {
    try {
      final response = await _apiService.client.get('/leave-types');
      return response.data;
    } catch (e) {
      throw Exception('Failed to fetch leave types');
    }
  }

  Future<void> submitLeaveRequest(Map<String, dynamic> data) async {
    try {
      await _apiService.client.post('/leaves', data: data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Failed to submit request');
    }
  }
}
