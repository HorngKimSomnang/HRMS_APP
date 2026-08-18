import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';

import '../core/constants.dart';
import 'data_cache_service.dart';

class ApiService {
  final Dio _dio = Dio();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static Function(String message)? onUnauthenticated;
  static bool _isHandling401 = false;

  ApiService() {
    _dio.options.baseUrl = AppConstants.baseUrl;
    _dio.options.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(seconds: 30);
    _dio.options.sendTimeout = const Duration(seconds: 30);

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'auth_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401) {
          if (!e.requestOptions.path.endsWith('/login')) {
            await _storage.delete(key: 'auth_token');
            if (!_isHandling401) {
              _isHandling401 = true;
              final serverMsg = (e.response?.data is Map && e.response?.data['message'] is String)
                  ? e.response?.data['message'] as String
                  : '';
              onUnauthenticated?.call(serverMsg);
              Future.delayed(const Duration(seconds: 2), () {
                _isHandling401 = false;
              });
            }
          }
        }
        return handler.next(e);
      },
    ));

    _dio.interceptors.add(LogInterceptor(
      request: true,
      requestBody: true,
      responseBody: true,
      error: true,
    ));
  }

  static final ApiService instance = ApiService();

  Dio get client => _dio;

  /// Performs a GET request using the global DataCacheService to cache responses.
  /// If [forceRefresh] is true, it bypasses the cache and fetches from network.
  Future<Response> cachedGet(String path, {Map<String, dynamic>? queryParameters, bool forceRefresh = false, Options? options, CancelToken? cancelToken, void Function(int, int)? onReceiveProgress}) async {
    final uri = Uri(path: path, queryParameters: queryParameters);
    final fullUrlStr = uri.toString();
    
    if (!forceRefresh && DataCacheService.instance.has(fullUrlStr)) {
      return Response(
        requestOptions: RequestOptions(path: path),
        data: DataCacheService.instance.get(fullUrlStr),
        statusCode: 200,
      );
    }

    final response = await _dio.get(path, queryParameters: queryParameters, options: options, cancelToken: cancelToken, onReceiveProgress: onReceiveProgress);
    
    if (response.statusCode == 200) {
      final resource = DataCacheService.resourceFromUrl(path);
      DataCacheService.instance.set(fullUrlStr, response.data, resource: resource);
    }
    
    return response;
  }
}

class AppEvents {
  static final ValueNotifier<bool> passwordChanged = ValueNotifier<bool>(false);
}
