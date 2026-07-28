import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../core/notification_navigation.dart';
import '../providers/notification_provider.dart';
import '../l10n/app_localizations.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  @override
  void initState() {
    super.initState();
    // Refresh on open, then mark as read
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final provider = context.read<NotificationProvider>();
      await provider.fetchNotifications();
      await provider.markAllAsRead();
    });
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'leave_request':
        return LucideIcons.fileText;
      case 'leave_status':
        return LucideIcons.checkCircle2;
      case 'attendance':
        return LucideIcons.clock;
      case 'holiday':
      case 'announcement':
        return LucideIcons.calendar;
      case 'overtime_status':
        return LucideIcons.timer;
      case 'payslip_generated':
      case 'payslip_status':
        return LucideIcons.wallet;
      case 'clock_out_reminder':
        return LucideIcons.logOut;
      case 'task_completed':
        return LucideIcons.checkSquare;
      case 'task_assigned':
        return LucideIcons.clipboardList;
      case 'document_uploaded':
        return LucideIcons.fileArchive;
      case 'custom_entity_record_submitted':
      case 'custom_entity_record_replied':
        return LucideIcons.clipboardCheck;
      default:
        return LucideIcons.bell;
    }
  }

  Color _colorForType(String? type) {
    switch (type) {
      case 'leave_request':
        return const Color(0xFF8B5CF6); // purple
      case 'leave_status':
        return const Color(0xFF10B981); // green
      case 'attendance':
        return const Color(0xFFF59E0B); // amber
      case 'holiday':
      case 'announcement':
        return const Color(0xFF3B82F6); // blue
      case 'overtime_status':
        return const Color(0xFFF97316); // orange
      case 'payslip_generated':
      case 'payslip_status':
        return const Color(0xFF059669); // emerald
      case 'clock_out_reminder':
        return const Color(0xFFF59E0B); // amber
      case 'task_completed':
        return const Color(0xFF10B981); // green
      case 'task_assigned':
        return const Color(0xFFEF4444); // red
      case 'document_uploaded':
        return const Color(0xFF06B6D4); // cyan
      case 'custom_entity_record_submitted':
      case 'custom_entity_record_replied':
        return const Color(0xFF14B8A6); // teal
      default:
        return const Color(0xFF6B7280); // gray
    }
  }

  String _timeAgo(String? createdAt) {
    if (createdAt == null) return '';
    try {
      final dt = DateTime.parse(createdAt).toLocal();
      final diff = DateTime.now().difference(dt);
      final l10n = AppLocalizations.of(context)!;
      if (diff.inMinutes < 1) return l10n.justNow;
      if (diff.inMinutes < 60) return l10n.minutesAgo(diff.inMinutes);
      if (diff.inHours < 24) return l10n.hoursAgo(diff.inHours);
      return l10n.daysAgo(diff.inDays);
    } catch (_) {
      return '';
    }
  }

  Future<void> _confirmClearAll(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          AppLocalizations.of(context)!.clearAll,
          style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold),
        ),
        content: Text(
          AppLocalizations.of(context)!.confirmClearAllNotifications,
          style: GoogleFonts.notoSansKhmer(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              AppLocalizations.of(context)!.cancel,
              style: GoogleFonts.notoSansKhmer(color: Colors.grey),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              AppLocalizations.of(context)!.clearAll,
              style: GoogleFonts.notoSansKhmer(
                color: Colors.red,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (!context.mounted) return;
      context.read<NotificationProvider>().clearAllNotifications();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(
          AppLocalizations.of(context)!.notifications,
          style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.trash2),
            tooltip: AppLocalizations.of(context)!.clearAll,
            onPressed: () => _confirmClearAll(context),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, provider, _) {
          if (provider.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      LucideIcons.bellOff,
                      size: 44,
                      color: Colors.blue.shade200,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    AppLocalizations.of(context)!.allCaughtUp,
                    style: GoogleFonts.notoSansKhmer(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppLocalizations.of(context)!.noNewNotifications,
                    style: GoogleFonts.notoSansKhmer(
                      fontSize: 14,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: provider.fetchNotifications,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: provider.notifications.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final n = provider.notifications[index];
                final notificationId = n['id']?.toString() ?? index.toString();

                return Dismissible(
                  key: Key(notificationId),
                  direction: DismissDirection.endToStart,
                  onDismissed: (direction) {
                    provider.deleteNotification(notificationId);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          AppLocalizations.of(context)!.notificationDeleted,
                        ),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    decoration: BoxDecoration(
                      color: Colors.red.shade400,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(LucideIcons.trash2, color: Colors.white),
                  ),
                  child: _buildNotificationCard(n),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildNotificationCard(dynamic n) {
    final Map<String, dynamic> nData = n is Map<String, dynamic> ? n : {};

    // Laravel stores notification payload inside 'data' field
    final Map<String, dynamic> payload = (nData['data'] is Map<String, dynamic>)
        ? nData['data']
        : {};

    final String? type = payload['type'] as String?;
    final String title = (payload['title'] as String?) ?? _labelForType(type);
    final String message =
        (payload['message'] as String?) ??
        AppLocalizations.of(context)!.defaultNotificationMessage;
    final bool isRead = nData['read_at'] != null;
    final String time = _timeAgo(nData['created_at'] as String?);

    final color = _colorForType(type);
    final icon = _iconForType(type);
    final destination = notificationRouteForPayload(payload);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      decoration: BoxDecoration(
        color: isRead ? Colors.white : color.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isRead ? Colors.grey.shade200 : color.withValues(alpha: 0.25),
          width: isRead ? 1 : 1.5,
        ),
        boxShadow: isRead
            ? []
            : [
                BoxShadow(
                  color: color.withValues(alpha: 0.08),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: destination == null ? null : () => context.push(destination),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon bubble
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 22, color: color),
              ),
              const SizedBox(width: 14),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: GoogleFonts.notoSansKhmer(
                              fontSize: 14,
                              fontWeight: isRead
                                  ? FontWeight.w500
                                  : FontWeight.w700,
                              color: isRead ? Colors.grey[700] : Colors.black87,
                            ),
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      message,
                      style: GoogleFonts.notoSansKhmer(
                        fontSize: 13,
                        color: Colors.grey[600],
                        height: 1.4,
                      ),
                    ),
                    if (time.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            LucideIcons.clock,
                            size: 12,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(width: 4),
                          Text(
                            time,
                            style: GoogleFonts.notoSansKhmer(
                              fontSize: 11,
                              color: Colors.grey[400],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _labelForType(String? type) {
    final l10n = AppLocalizations.of(context)!;
    switch (type) {
      case 'leave_request':
        return l10n.notifLeaveRequest;
      case 'leave_status':
        return l10n.notifLeaveUpdate;
      case 'attendance':
        return l10n.notifAttendanceUpdate;
      case 'holiday':
      case 'announcement':
        return l10n.notifNewHoliday;
      case 'overtime_status':
        return 'Overtime Update';
      case 'payslip_generated':
      case 'payslip_status':
        return 'Payslip Update';
      case 'clock_out_reminder':
        return 'Clock-Out Reminder';
      case 'task_completed':
        return l10n.notifTaskCompleted;
      case 'task_assigned':
        return l10n.notifNewTaskAssigned;
      case 'document_uploaded':
        return l10n.notifDocumentReceived;
      case 'custom_entity_record_submitted':
        return l10n.notifFormSubmission;
      case 'custom_entity_record_replied':
        return 'Form Reply';
      default:
        return l10n.notificationLabel;
    }
  }
}
