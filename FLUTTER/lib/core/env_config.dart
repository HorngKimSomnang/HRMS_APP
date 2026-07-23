
class EnvConfig {
 

  

  /// Get the correct Base URL based on the current platform/device.
  ///
  /// Override at build time without editing source, e.g.:
  ///   flutter build apk --release --dart-define=API_BASE_URL=https://your-domain.com/api
  /// If no --dart-define is provided, falls back to the ngrok tunnel below.
  static String get baseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (fromEnv.isNotEmpty) return fromEnv;
    // Fallback: the static ngrok domain so the Android device can connect over the internet
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
