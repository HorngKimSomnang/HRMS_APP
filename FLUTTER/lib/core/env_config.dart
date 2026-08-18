class EnvConfig {
  /// Get the correct Base URL based on the current platform/device.
  ///
  /// Override at build time without editing source, e.g.:
  ///   flutter build apk --release --dart-define=API_BASE_URL=https://your-domain.com/api
  /// Production builds use the DigitalOcean-hosted API by default.
  static String get baseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (fromEnv.isNotEmpty) return fromEnv;
    // --- PRODUCTION URL (Uncomment to revert) ---
    // return 'https://hr-application.duckdns.org/api';

    // --- LOCAL DEVELOPMENT URL ---
    // Ensure your backend is running, e.g. `php artisan serve --host=0.0.0.0 --port=8000`
    return 'http://127.0.0.1:8000/api';
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

  /// Fixes a backend-generated URL (which might use localhost) to use the physical device IP/host.
  static String fixUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    
    // Parse the URL to manipulate it easily
    Uri uri;
    try {
      uri = Uri.parse(url);
    } catch (_) {
      return url;
    }

    String path = uri.path;
    
    // Automatically rewrite /storage/ to /api/file/ to avoid 403 Forbidden errors
    if (path.startsWith('/storage/')) {
      path = path.replaceFirst('/storage/', '/api/file/');
    }

    if (url.contains('localhost') || url.contains('127.0.0.1')) {
       return rootUrl + path;
    }
    
    // If it's a relative path starting with /storage/ or /api/file/, prepend rootUrl
    if (url.startsWith('/')) {
       return rootUrl + path;
    }

    // Return the original url but with the path fixed if it was /storage/
    if (uri.hasScheme && uri.hasAuthority) {
      return uri.replace(path: path).toString();
    }
    
    return url;
  }
}
