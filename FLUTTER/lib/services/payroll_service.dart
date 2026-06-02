import 'package:dio/dio.dart';
import 'api_service.dart';

class PayrollService {
  final ApiService _apiService = ApiService();

  // --- Payroll Requests ---

  Future<List<dynamic>> getPayrollRequests({String? type}) async {
    try {
      final queryParams = type != null ? {'type': type} : null;
      final response = await _apiService.client.get('/payroll-requests', queryParameters: queryParams);
      return response.data;
    } on DioException catch (e) {
      throw e.response?.data['message'] ?? 'Failed to fetch payroll requests';
    }
  }

  Future<Map<String, dynamic>> submitPayrollRequest(Map<String, dynamic> data) async {
    try {
      final response = await _apiService.client.post('/payroll-requests', data: data);
      return response.data;
    } on DioException catch (e) {
      throw e.response?.data['message'] ?? 'Failed to submit payroll request';
    }
  }

  Future<Map<String, dynamic>> updatePayrollRequest(int id, Map<String, dynamic> data) async {
    try {
      final response = await _apiService.client.put('/payroll-requests/$id', data: data);
      return response.data;
    } on DioException catch (e) {
      throw e.response?.data['message'] ?? 'Failed to update payroll request';
    }
  }

  Future<void> deletePayrollRequest(int id) async {
    try {
      await _apiService.client.delete('/payroll-requests/$id');
    } on DioException catch (e) {
      throw e.response?.data['message'] ?? 'Failed to delete payroll request';
    }
  }

  // --- Payslips ---

  Future<List<dynamic>> getPayslips() async {
    try {
      final response = await _apiService.client.get('/payslips');
      return response.data;
    } on DioException catch (e) {
      throw e.response?.data['message'] ?? 'Failed to fetch payslips';
    }
  }

  Future<void> signPayslip(int id) async {
    try {
      await _apiService.client.post('/payslips/$id/sign');
    } on DioException catch (e) {
      throw e.response?.data['message'] ?? 'Failed to sign payslip';
    }
  }
}
