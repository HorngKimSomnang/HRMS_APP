import '../services/api_service.dart';

class DocumentService {
  final ApiService _apiService = ApiService();

  Future<List<dynamic>> fetchDocuments() async {
    try {
      final response = await _apiService.client.get('/documents');
      return response.data;
    } catch (e) {
      throw Exception('Failed to load documents');
    }
  }

  Future<void> deleteDocument(int id) async {
    try {
      await _apiService.client.delete('/documents/$id');
    } catch (e) {
      throw Exception('Failed to delete document');
    }
  }
}
