import 'package:dio/dio.dart';
import '../core/error_utils.dart';
import 'api_service.dart';

class LeaveService {
  final ApiService _apiService = ApiService();

  Future<List<dynamic>> fetchLeaves({bool forceRefresh = false}) async {
    try {
      final response = await ApiService.instance.cachedGet('/leaves', forceRefresh: forceRefresh);
      return response.data; // Laravel returns List directly
    } catch (e) {
      throw Exception('Failed to fetch leaves');
    }
  }

  Future<List<dynamic>> fetchLeaveTypes({bool forceRefresh = false}) async {
    try {
      final response = await ApiService.instance.cachedGet('/leave-types', forceRefresh: forceRefresh);
      return response.data;
    } catch (e) {
      throw Exception('Failed to fetch leave types');
    }
  }

  Future<List<dynamic>> fetchLeaveBalances({bool forceRefresh = false}) async {
    try {
      final response = await ApiService.instance.cachedGet('/leaves/balances', forceRefresh: forceRefresh);
      return response.data;
    } catch (e) {
      throw Exception('Failed to fetch leave balances');
    }
  }

  Future<void> submitLeaveRequest(Map<String, dynamic> data) async {
    try {
      await _apiService.client.post('/leaves', data: data);
    } on DioException catch (e) {
      throw Exception(serverMessage(e, 'Failed to submit request'));
    }
  }
}
