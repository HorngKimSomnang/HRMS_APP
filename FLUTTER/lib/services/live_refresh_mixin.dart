import 'dart:async';
import 'package:flutter/widgets.dart';
import 'live_version_service.dart';

/// A mixin for StatefulWidget States that auto-refreshes when a watched resource
/// changes via WebSocket or polling.
///
/// Usage:
///   class _MyScreenState extends State<MyScreen> with LiveRefreshMixin {
///     @override
///     List<String> get watchedResources => ['leaves'];
///
///     @override
///     void onLiveRefresh(String resource) => _loadLeaves();
///
///     @override
///     void initState() {
///       super.initState();
///       startLiveRefresh();  // <-- call this
///       _loadLeaves();
///     }
///
///     @override
///     void dispose() {
///       stopLiveRefresh();   // <-- call this
///       super.dispose();
///     }
///   }
mixin LiveRefreshMixin<T extends StatefulWidget> on State<T> {
  StreamSubscription<String>? _liveRefreshSubscription;

  /// Override to specify which resource names trigger a refresh.
  List<String> get watchedResources;

  /// Called when any watched resource changes. Override to reload data.
  void onLiveRefresh(String resource);

  void startLiveRefresh() {
    _liveRefreshSubscription = LiveVersionService.instance.resourceChanged.listen((resource) {
      if (!mounted) return;
      if (watchedResources.contains(resource) || watchedResources.contains('*')) {
        onLiveRefresh(resource);
      }
    });
  }

  void stopLiveRefresh() {
    _liveRefreshSubscription?.cancel();
    _liveRefreshSubscription = null;
  }
}
