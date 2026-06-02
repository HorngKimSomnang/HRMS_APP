import 'package:dio/dio.dart';
import 'api_service.dart';

class TaskService {
  final ApiService _apiService = ApiService();

  Future<List<dynamic>> fetchTasks() async {
    try {
      final response = await _apiService.client.get('/tasks');
      final data = response.data;
      if (data is List) {
        return data;
      } else if (data is Map<String, dynamic> && data.containsKey('data')) {
        return data['data'];
      }
      return []; 
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  Future<void> updateTaskWithSubmission(int id, String status, {String? filePath}) async {
    try {
      if (filePath == null) {
         await _apiService.client.put('/tasks/$id', data: {'status': status});
         return;
      }
      
      final formData = FormData.fromMap({
        '_method': 'PUT',
        'status': status,
        'submission': await MultipartFile.fromFile(filePath),
      });
      await _apiService.client.post(
        '/tasks/$id', 
        data: formData,
        options: Options(
          headers: {
            Headers.contentLengthHeader: formData.length,
          },
        ),
      );
    } catch (e) {
      throw Exception('Failed to update task');
    }
  }
}
