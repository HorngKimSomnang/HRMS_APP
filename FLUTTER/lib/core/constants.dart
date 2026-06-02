import 'env_config.dart';

class AppConstants {
  // ---------------------------------------------------------------------------
  // 🔧 NETWORK CONFIGURATION
  // ---------------------------------------------------------------------------
  
  // Base URL is now centrally managed in 'lib/core/env_config.dart'
  // to support both Emulator and Physical Devices automatically.
  static String get baseUrl => EnvConfig.baseUrl;

  /// Helper to get generic storage URLs for images/files
  static String get storageUrl => EnvConfig.storageUrl;

  /// Helper to get the root server URL (without /api)
  static String get rootUrl => EnvConfig.rootUrl;

  static const String appName = 'HEN CHEN INVESTMENT CO.LTD';
}
