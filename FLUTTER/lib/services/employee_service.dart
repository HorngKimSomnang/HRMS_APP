import 'dart:io';
import 'package:dio/dio.dart';
import 'api_service.dart';

class EmployeeService {
  final ApiService _apiService = ApiService();

  Future<void> uploadProfilePicture(int employeeId, File file) async {
    String fileName = file.path.split('/').last;
    FormData formData = FormData.fromMap({
      "profile_picture": await MultipartFile.fromFile(file.path, filename: fileName),
      "_method": "PUT", // Laravel sometimes needs this for PUT with files
    });

    // We also need to send other required fields if the backend validation is strict on update?
    // My backend validation: "email: required... unique...". 
    // Wait. My backend `update` method validates ALL fields as REQUIRED.
    // "first_name" => 'required', "last_name" => 'required'...
    // THIS IS BAD for partial updates.
    // The backend `update` method I viewed earlier (EmployeeController line 85) requires EVERYTHING.
    // I need to fix the BACKEND first to allow nullable/partial updates OR I need to fetch the existing employee data and send it back.
    // Sending everything back is safer for now without changing backend logic too much, BUT partial validation is better API design.
    // Actually, `update` method validation rules are 'required'.
    // I should change Backend validation to 'sometimes|required' or use a separate endpoint for uploading picture?
    // Separate endpoint is cleaner. `POST /employees/{id}/upload-picture`.
    // OR just fix the validation to use `sometimes`.
    // Fixing validation to `sometimes` is standard.
    
    // Let's FIX BACKEND Validation first.
    // But since I am in "Flutter" mode for user... I can try to fix backend quickly.
    // To avoid context switching too much, I'll create a new endpoint `POST /employees/{id}/upload-picture` in Laravel?
    // No, standard `update` should handle it. I will modify Laravel validation to `sometimes`.
    
    // For now, I will write this service assuming I'll fix the backend.
    
    await _apiService.client.post(
       '/profile/update?_method=PUT', 
       data: formData
    );
  }

  Future<List<dynamic>> fetchHolidays({bool forceRefresh = false}) async {
    final response = await ApiService.instance.cachedGet('/holidays', forceRefresh: forceRefresh);
    return response.data;
  }
}
