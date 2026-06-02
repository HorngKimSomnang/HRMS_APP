
class EnvConfig {
 

  
  // 2. The Port your Laravel server is running on
  static const String _port = '8000';

  /// Get the correct Base URL based on the current platform/device
  static String get baseUrl {
    // For the demo, we will use 127.0.0.1 and rely on ADB Reverse via USB.
    // This is 100% bulletproof and won't break if your Wi-Fi changes.
    return 'http://127.0.0.1:$_port/api';
  }

  /// Get the Storage/Image URL prefix
  static String get storageUrl {
    // We use the new /api/file route to bypass Windows PHP built-in server bugs with MP4 files
    return baseUrl.replaceAll('/api', '/api/file');
  }
  
  /// Get the Root URL (without /api)
  static String get rootUrl {
    return baseUrl.replaceAll('/api', '');
  }
}
