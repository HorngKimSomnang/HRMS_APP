import 'dart:collection';

/// A lightweight in-memory cache for API responses.
///
/// Keys are the full URL strings (e.g. `/payslips`, `/announcements?page=1`).
/// Resources are the first path segment after `/api/` (e.g. `payslips`,
/// `announcements`) and are used for bulk invalidation when the backend bumps
/// a live-data version.
class DataCacheService {
  DataCacheService._();
  static final DataCacheService instance = DataCacheService._();

  // Maps URL → cached payload
  final Map<String, dynamic> _cache = LinkedHashMap();
  // Maps URL → list of resources it belongs to
  final Map<String, List<String>> _urlResources = {};

  // ---------------------------------------------------------------------------
  // Read / Write
  // ---------------------------------------------------------------------------

  /// Returns the cached value for [url], or `null` if there is no entry.
  dynamic get(String url) => _cache[url];

  /// Returns `true` if there is a cached value for [url].
  bool has(String url) => _cache.containsKey(url);

  /// Stores [data] under [url].  [resource] is the logical resource name
  /// (e.g. `payslips`) that can later be used to invalidate this entry.
  void set(String url, dynamic data, {String? resource}) {
    _cache[url] = data;
    if (resource != null) {
      _urlResources[url] = [resource];
    }
  }

  // ---------------------------------------------------------------------------
  // Invalidation
  // ---------------------------------------------------------------------------

  /// Removes all cache entries that belong to [resource].
  void invalidate(String resource) {
    final toRemove = _urlResources.entries
        .where((e) => e.value.contains(resource))
        .map((e) => e.key)
        .toList();
    for (final url in toRemove) {
      _cache.remove(url);
      _urlResources.remove(url);
    }
  }

  /// Removes every cached entry.
  void invalidateAll() {
    _cache.clear();
    _urlResources.clear();
  }

  /// Extracts the first meaningful path segment after `/api/` from a URL,
  /// e.g. `/api/payslips` → `payslips`, `/payslips` → `payslips`.
  static String? resourceFromUrl(String url) {
    final segments = url.split('?').first.split('/').where((s) => s.isNotEmpty).toList();
    final apiIndex = segments.indexOf('api');
    if (apiIndex >= 0 && apiIndex + 1 < segments.length) {
      return segments[apiIndex + 1];
    }
    if (segments.isNotEmpty) return segments.first;
    return null;
  }
}
