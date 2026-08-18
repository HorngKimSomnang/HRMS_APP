import 'package:dio/dio.dart';
import '../core/error_utils.dart';
import 'api_service.dart';

class PayrollService {
  final ApiService _apiService = ApiService();

  // --- Payslips ---

  Future<List<dynamic>> getPayslips({bool forceRefresh = false}) async {
    try {
      final response = await ApiService.instance.cachedGet('/payslips?personal=true', forceRefresh: forceRefresh);
      return response.data;
    } on DioException catch (e) {
      throw Exception(serverMessage(e, 'Failed to fetch payslips'));
    }
  }
}
