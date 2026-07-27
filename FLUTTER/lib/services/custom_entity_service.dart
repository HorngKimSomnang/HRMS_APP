import 'dart:io';
import 'package:dio/dio.dart';
import '../core/error_utils.dart';
import 'api_service.dart';

class CustomEntityService {
  final ApiService _apiService = ApiService();

  Future<List<dynamic>> fetchSubmittableEntities() async {
    try {
      final response = await _apiService.client.get('/my/entities');
      return response.data['data'] as List<dynamic>;
    } catch (e) {
      throw Exception('Failed to load forms');
    }
  }

  Future<Map<String, dynamic>> fetchEntity(String slug) async {
    try {
      final response = await _apiService.client.get('/my/entities/$slug');
      return response.data['data'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Failed to load form');
    }
  }

  Future<List<dynamic>> fetchMyRecords(String slug) async {
    try {
      final response = await _apiService.client.get('/my/entities/$slug/records');
      return response.data['data']['data'] as List<dynamic>;
    } catch (e) {
      throw Exception('Failed to load history');
    }
  }

  Future<Map<String, dynamic>> submitRecord(String slug, Map<String, dynamic> data) async {
    try {
      final response = await _apiService.client.post('/my/entities/$slug/records', data: {'data': data});
      return response.data['data'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(serverMessage(e, 'Failed to submit'));
    }
  }

  Future<void> uploadRecordFile(String slug, int recordId, String fieldKey, File file) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: file.path.split('/').last),
      });
      await _apiService.client.post('/my/entities/$slug/records/$recordId/files/$fieldKey', data: formData);
    } on DioException catch (e) {
      throw Exception(serverMessage(e, 'Failed to upload file'));
    }
  }

  Future<void> updateRecord(String slug, int recordId, Map<String, dynamic> data) async {
    try {
      await _apiService.client.put('/my/entities/$slug/records/$recordId', data: {'data': data});
    } on DioException catch (e) {
      throw Exception(serverMessage(e, 'Failed to update'));
    }
  }
}
