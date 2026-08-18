import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dart_pusher_channels/dart_pusher_channels.dart';
import '../core/env_config.dart';

/// Manages a persistent WebSocket connection to Laravel Reverb via Pusher protocol.
class WebSocketService {
  WebSocketService._();
  static final WebSocketService instance = WebSocketService._();

  final _storage = const FlutterSecureStorage();
  PusherChannelsClient? _client;
  StreamSubscription? _connectionSubscription;
  Channel? _publicChannel;

  final _liveDataController = StreamController<String>.broadcast();
  Stream<String> get liveDataStream => _liveDataController.stream;

  bool _connected = false;
  bool get isConnected => _connected;

  Future<void> connect([String? token]) async {
    if (_connected || _client != null) return;
    token ??= await _storage.read(key: 'auth_token');
    if (token == null) return;

    final apiUri = Uri.parse(EnvConfig.baseUrl);
    final host = apiUri.host;

    try {
      final options = PusherChannelsOptions.fromHost(
        scheme: 'ws',
        host: host,
        port: 8080,
        key: 'c0bwjntxkk15u6fganq1', // REVERB_APP_KEY
        shouldSupplyMetadataQueries: true,
      );

      _client = PusherChannelsClient.websocket(
        options: options,
        connectionErrorHandler: (exception, trace, refresh) {
          if (kDebugMode) print('[WS] Error: $exception');
          Future.delayed(const Duration(seconds: 2), refresh);
        },
      );

      _connectionSubscription = _client!.onConnectionEstablished.listen((_) {
        _connected = true;
        if (kDebugMode) print('[WS] Connected to Reverb at $host:8080');

        _publicChannel = _client!.publicChannel('hrms.live');
        _publicChannel!.subscribeIfNotUnsubscribed();
        
        _publicChannel!.bind('LiveDataChanged').listen((event) {
          _handleEvent(event.name, event.data);
        });

        _publicChannel!.bind('PermissionChanged').listen((event) {
          _handleEvent(event.name, event.data);
        });
      });

      // Connection states and errors are handled by connectionErrorHandler above.

      _client!.connect();
    } catch (e) {
      if (kDebugMode) print('[WS] Could not connect: $e');
    }
  }

  void _handleEvent(String eventName, dynamic data) {
    if (kDebugMode) print('[WS] Event: $eventName');

    if (eventName == 'LiveDataChanged') {
      final resource = _parseResource(data);
      if (resource != null) _liveDataController.add(resource);
    }

    if (eventName == 'PermissionChanged') {
      _liveDataController.add('permissions');
    }
  }

  void triggerLocalRefresh(String resource) {
    _liveDataController.add(resource);
  }

  String? _parseResource(dynamic data) {
    try {
      Map<String, dynamic> parsed;
      if (data is String) {
        parsed = jsonDecode(data) as Map<String, dynamic>;
      } else if (data is Map) {
        parsed = Map<String, dynamic>.from(data);
      } else {
        return null;
      }
      return parsed['resource'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<void> disconnect() async {
    _publicChannel?.unsubscribe();
    _publicChannel = null;
    _client?.disconnect();
    _client?.dispose();
    _client = null;
    _connectionSubscription?.cancel();
    _connectionSubscription = null;
    _connected = false;
    if (kDebugMode) print('[WS] Disconnected from Reverb manually');
  }
}
