import 'package:dio/dio.dart';
import 'api_service.dart';

class TaskService {
  final ApiService _apiService = ApiService();

  Future<List<dynamic>> fetchTasks({bool forceRefresh = false}) async {
    try {
      final response = await ApiService.instance.cachedGet('/tasks', forceRefresh: forceRefresh);
      final data = response.data;
      if (data is List) {
        return data;
      } else if (data is Map<String, dynamic> && data.containsKey('data')) {
        final innerData = data['data'];
        if (innerData is List) {
          return innerData;
        } else if (innerData is Map<String, dynamic> && innerData.containsKey('data')) {
          // Handle Laravel pagination wrapper
          return innerData['data'] is List ? innerData['data'] : [];
        }
      }
      return [];
    } on DioException {
      rethrow;
    } catch (_) {
      throw Exception('Failed to load tasks');
    }
  }

  Future<void> updateTaskWithSubmission(
    int id,
    String status, {
    String? filePath,
    String? note,
  }) async {
    try {
      if (filePath == null && note == null) {
        await _apiService.client.put('/tasks/$id', data: {'status': status});
        return;
      }

      final Map<String, dynamic> formDataMap = {
        '_method': 'PUT',
        'status': status,
      };

      if (note != null && note.isNotEmpty) {
        formDataMap['submission_note'] = note;
      }

      if (filePath != null) {
        formDataMap['submission'] = await MultipartFile.fromFile(filePath);
      }

      final formData = FormData.fromMap(formDataMap);
      await _apiService.client.post(
        '/tasks/$id',
        data: formData,
        options: Options(
          headers: {Headers.contentLengthHeader: formData.length},
        ),
      );
    } catch (e) {
      throw Exception('Failed to update task');
    }
  }
}
