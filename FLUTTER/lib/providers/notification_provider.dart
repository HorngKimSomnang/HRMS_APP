import 'package:flutter/material.dart';
import 'dart:async';
import '../services/notification_service.dart';
import '../services/local_notification_service.dart';

import 'package:flutter/services.dart';

class NotificationProvider with ChangeNotifier {
  final NotificationService _service = NotificationService();

  List<dynamic> _notifications = [];
  int _unreadCount = 0;
  bool _loading = false;
  String? _lastSeenId;
  Timer? _pollingTimer;

  List<dynamic> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get loading => _loading;

  /// Start background polling for real-time alerts
  void startPolling() {
    if (_pollingTimer != null && _pollingTimer!.isActive) return;
    _pollingTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      fetchNotifications(isPolling: true);
    });
  }

  /// Stop background polling
  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  /// Fetch notifications from the API and update state.
  Future<void> fetchNotifications({bool isPolling = false}) async {
    if (!isPolling) {
      _loading = true;
      notifyListeners();
    }
    try {
      final responseData = await _service.fetchNotifications();
      final data = responseData['data'] ?? responseData;
      _notifications = data['notifications'] ?? [];
      _unreadCount = data['unread_count'] ?? 0;

      if (_notifications.isNotEmpty) {
        final latestId = _notifications.first['id'].toString();
        // If we found a new notification and we have initialized _lastSeenId
        if (_lastSeenId != null && _lastSeenId != latestId) {
          // Trigger local in-app notification!
          final latestData = _notifications.first['data'] ?? {};
          
          // Trigger physical vibration
          HapticFeedback.vibrate();
          
          LocalNotificationService().showNotification(
            id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
            title: 'New HRMS Alert',
            body: latestData['message'] ?? 'You have a new notification',
          );
        }
        _lastSeenId = latestId;
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
