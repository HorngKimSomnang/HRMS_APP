import 'package:flutter/material.dart';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/notification_service.dart';
import '../services/local_notification_service.dart';
import '../core/notification_navigation.dart';

import 'package:flutter/services.dart';

class NotificationProvider with ChangeNotifier {
  static const _lastAlertedNotificationKey =
      'last_alerted_hrms_notification_id';

  final NotificationService _service = NotificationService();

  List<dynamic> _notifications = [];
  int _unreadCount = 0;
  bool _loading = false;
  String? _lastSeenId;
  bool _lastSeenIdLoaded = false;
  Timer? _pollingTimer;
  String? _notificationVersion;
  bool _checkingVersion = false;

  List<dynamic> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get loading => _loading;

  /// Start background polling for real-time alerts
  void startPolling() {
    if (_pollingTimer != null && _pollingTimer!.isActive) return;
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      _pollForChanges();
    });
    _pollForChanges();
  }

  /// Stop background polling
  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> _pollForChanges() async {
    if (_checkingVersion) return;
    _checkingVersion = true;

    try {
      final nextVersion = await _service.fetchNotificationVersion();
      final previousVersion = _notificationVersion;
      _notificationVersion = nextVersion;

      if (previousVersion == null || previousVersion != nextVersion) {
        await fetchNotifications(isPolling: true);
      }
    } catch (e) {
      debugPrint('NotificationProvider: version check error: $e');
    } finally {
      _checkingVersion = false;
    }
  }

  /// Fetch notifications from the API and update state.
  Future<void> fetchNotifications({bool isPolling = false}) async {
    if (!isPolling) {
      _loading = true;
      notifyListeners();
    }
    try {
      if (!_lastSeenIdLoaded) {
        final preferences = await SharedPreferences.getInstance();
        _lastSeenId = preferences.getString(_lastAlertedNotificationKey);
        _lastSeenIdLoaded = true;
      }

      final responseData = await _service.fetchNotifications();
      final data = responseData['data'] ?? responseData;
      _notifications = data['notifications'] ?? [];
      _unreadCount = data['unread_count'] ?? 0;

      if (_notifications.isNotEmpty) {
        final latestNotification = _notifications.first;
        final latestId = latestNotification['id'].toString();
        final isUnread = latestNotification['read_at'] == null;

        if (isUnread && _lastSeenId != latestId) {
          final rawData = latestNotification['data'];
          final latestData = rawData is Map
              ? Map<String, dynamic>.from(rawData)
              : <String, dynamic>{};

          HapticFeedback.vibrate();

          await LocalNotificationService().showNotification(
            id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
            title: 'New HRMS Alert',
            body: latestData['message'] ?? 'You have a new notification',
            payload: notificationRouteForPayload(latestData),
          );
        }

        _lastSeenId = latestId;
        final preferences = await SharedPreferences.getInstance();
        await preferences.setString(_lastAlertedNotificationKey, latestId);
      }
    } catch (e) {
      debugPrint('NotificationProvider: fetch error: $e');
      if (!isPolling) {
        _notifications = [];
        _unreadCount = 0;
      }
    } finally {
      if (!isPolling) {
        _loading = false;
      }
      notifyListeners();
    }
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }

  /// Mark all as read on the server, then clear local badge count.
  Future<void> markAllAsRead() async {
    try {
      await _service.markAllAsRead();
      _unreadCount = 0;
      for (final n in _notifications) {
        if (n is Map) n['read_at'] = DateTime.now().toIso8601String();
      }
      notifyListeners();
    } catch (e) {
      debugPrint('NotificationProvider: markAllAsRead error: $e');
    }
  }

  /// Delete a specific notification and update local state.
  Future<void> deleteNotification(String id) async {
    // Optimistic removal
    final index = _notifications.indexWhere((n) => n['id'] == id);
    if (index != -1) {
      final removedItem = _notifications.removeAt(index);
      if (removedItem['read_at'] == null && _unreadCount > 0) {
        _unreadCount--;
      }
      notifyListeners();

      try {
        await _service.deleteNotification(id);
      } catch (_) {
        // Rollback on failure
        _notifications.insert(index, removedItem);
        if (removedItem['read_at'] == null) _unreadCount++;
        notifyListeners();
      }
    }
  }

  /// Delete all notifications and clear local state.
  Future<void> clearAllNotifications() async {
    final oldNotifications = List.from(_notifications);
    final oldUnreadCount = _unreadCount;

    _notifications = [];
    _unreadCount = 0;
    notifyListeners();

    try {
      await _service.deleteAllNotifications();
    } catch (_) {
      // Rollback on failure
      _notifications = oldNotifications;
      _unreadCount = oldUnreadCount;
      notifyListeners();
    }
  }
}
