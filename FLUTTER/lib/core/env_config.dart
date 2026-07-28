class EnvConfig {
  /// Get the correct Base URL based on the current platform/device.
  ///
  /// Override at build time without editing source, e.g.:
  ///   flutter build apk --release --dart-define=API_BASE_URL=https://your-domain.com/api
  /// Production builds use the DigitalOcean-hosted API by default.
  static String get baseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (fromEnv.isNotEmpty) return fromEnv;
    return 'https://hr-application.duckdns.org/api';
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
