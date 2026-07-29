import 'package:dio/dio.dart';
import '../core/error_utils.dart';
import 'api_service.dart';

class PayrollService {
  final ApiService _apiService = ApiService();

  // --- Payslips ---

  Future<List<dynamic>> getPayslips() async {
    try {
      final response = await _apiService.client.get('/payslips');
      return response.data;
    } on DioException catch (e) {
      throw Exception(serverMessage(e, 'Failed to fetch payslips'));
    }
  }
}
