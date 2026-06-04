
class EnvConfig {
 

  

  /// Get the correct Base URL based on the current platform/device
  static String get baseUrl {
    // Using the static ngrok domain so the Android device can connect over the internet
    return 'https://lilla-semivulcanized-geopolitically.ngrok-free.dev/api';
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
