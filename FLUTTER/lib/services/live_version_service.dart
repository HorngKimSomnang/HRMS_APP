import 'dart:async';
import 'package:flutter/foundation.dart';
import 'api_service.dart';
import 'data_cache_service.dart';
import 'websocket_service.dart';

class LiveVersionService {
  LiveVersionService._();
  static final LiveVersionService instance = LiveVersionService._();

  Timer? _timer;
  Map<String, int> _knownVersions = {};
  StreamSubscription<String>? _wsSubscription;

  // Public broadcast stream: any screen can subscribe to get the name of the
  // resource that just changed (e.g. 'leaves', 'payslips', 'attendance').
  final _resourceChangedController = StreamController<String>.broadcast();
  Stream<String> get resourceChanged => _resourceChangedController.stream;

  void startPolling({int intervalSeconds = 30}) {
    if (_timer != null) return;

    // WebSocket primary — instant push
    _wsSubscription ??= WebSocketService.instance.liveDataStream.listen((resource) {
      DataCacheService.instance.invalidate(resource);
      _resourceChangedController.add(resource);
    });

    // Initial version fetch
    _fetchVersions();

    // Polling fallback (30s) — catches anything WebSocket might miss
    _timer = Timer.periodic(Duration(seconds: intervalSeconds), (timer) {
      _fetchVersions();
    });
  }

  void stopPolling() {
    _timer?.cancel();
    _timer = null;
    _wsSubscription?.cancel();
    _wsSubscription = null;
  }

  Future<void> _fetchVersions() async {
    try {
      final response = await ApiService.instance.client.get('/data-versions');
      if (response.statusCode == 200) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          for (final entry in data.entries) {
            final resource = entry.key;
            final version = entry.value is int ? entry.value as int : int.tryParse(entry.value.toString()) ?? 0;

            if (_knownVersions.containsKey(resource)) {
              if (_knownVersions[resource] != version) {
                if (kDebugMode) {
                  print('LiveVersionService: "$resource" changed (${_knownVersions[resource]} → $version). Invalidating cache.');
                }
                DataCacheService.instance.invalidate(resource);
                _resourceChangedController.add(resource);
              }
            }
            _knownVersions[resource] = version;
          }
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('LiveVersionService: Failed to fetch versions: $e');
      }
    }
  }
}
