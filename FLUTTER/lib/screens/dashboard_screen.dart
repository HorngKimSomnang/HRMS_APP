import 'dart:async';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';

import '../core/error_utils.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import 'package:geocoding/geocoding.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/attendance_service.dart';
import '../services/location_service.dart';
import '../providers/notification_provider.dart';
import '../core/constants.dart';
import '../services/local_notification_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permission_handler/permission_handler.dart';
import '../l10n/app_localizations.dart';
import 'holiday_screen.dart';
import 'payslip_screen.dart';
import 'overtime_screen.dart';
import 'attendance_history_screen.dart';
import 'document_viewer_screen.dart';
import 'package:skeletonizer/skeletonizer.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ApiService _apiService = ApiService();
  final AttendanceService _attendanceService = AttendanceService();
  final LocationService _locationService = LocationService();

  Map<String, dynamic>? _user;
  Map<String, dynamic>? _todayAttendance;
  bool _loading = true;
  String? _statusMessage;
  bool _isSuccess = false;
  String? _connectionError;

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final LocalNotificationService _notificationService = LocalNotificationService();

  Timer? _undoWindowTimer;

  static const _undoClockOutWindow = Duration(minutes: 5);

  bool get _canUndoClockOut {
    final clockOutRaw = _todayAttendance?['clock_out'];
    if (clockOutRaw == null) return false;
    final clockOut = DateTime.tryParse(clockOutRaw.toString());
    if (clockOut == null) return false;
    return DateTime.now().toUtc().difference(clockOut.toUtc()) < _undoClockOutWindow;
  }

  void _refreshUndoWindowTimer() {
    _undoWindowTimer?.cancel();
    _undoWindowTimer = null;
    if (!_canUndoClockOut) return;
    _undoWindowTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (!_canUndoClockOut) {
        timer.cancel();
        _undoWindowTimer = null;
      }
      setState(() {});
    });
  }

  @override
  void initState() {
    super.initState();
    _loadData();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final notifProvider = context.read<NotificationProvider>();
        notifProvider.fetchNotifications();
        notifProvider.startPolling();
      }
    });
    _requestNotificationPermission();
    _loadNotices();
  }

  Future<void> _requestNotificationPermission() async {
    final status = await Permission.notification.status;
    if (status.isDenied) await Permission.notification.request();
  }

  Future<void> _loadNotices() async {
    try {
      final response = await _apiService.client.get('/announcements/latest');
      final notices = response.data['data'] as List<dynamic>;
      if (notices.isNotEmpty) {
        final latestNotice = notices.first;
        final latestNoticeId = latestNotice['id'].toString();
        final lastSeenId = await _storage.read(key: 'last_seen_notice_id');
        if (lastSeenId != latestNoticeId) {
          if (!mounted) return;
          await _notificationService.showNotification(
            id: latestNotice['id'],
            title: AppLocalizations.of(context)!.newAnnouncementNotifTitle(latestNotice['title']),
            body: latestNotice['content'],
          );
          await _storage.write(key: 'last_seen_notice_id', value: latestNoticeId);
        }
      }
    } catch (_) {}
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        _apiService.client.get('/user'),
        _attendanceService.fetchToday(),
      ]);
      if (mounted) {
        setState(() {
          _user = (results[0] as dynamic).data;
          _todayAttendance = results[1] as Map<String, dynamic>?;
          _loading = false;
          _connectionError = null;
        });
        _refreshUndoWindowTimer();
      }
    } on DioException catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _connectionError = e.response != null ? 'HTTP ${e.response!.statusCode} from server' : (e.message ?? e.type.name);
        });
        if (e.response?.statusCode == 401) context.go('/login');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _connectionError = e.toString();
        });
      }
    }
  }

  @override
  void dispose() {
    _undoWindowTimer?.cancel();
    super.dispose();
  }

  Future<void> _handleUndoClockOut() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() => _statusMessage = null);
    try {
      await _attendanceService.undoClockOut();
      _statusMessage = l10n.clockOutUndone;
      _isSuccess = true;
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      _statusMessage = friendlyError(context, e);
      _isSuccess = false;
    } finally {
      if (mounted) setState(() {});
    }
  }

  Future<void> _handleAttendance(bool isClockIn) async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _statusMessage = l10n.gettingLocation;
      _isSuccess = false;
    });

    try {
      final position = await _locationService.getCurrentPosition();
      if (position == null) throw Exception(l10n.locationPermissionDenied);

      setState(() => _statusMessage = l10n.submittingEllipsis);

      // Reverse geocode to a human-readable address
      String locationName = l10n.unknownLocation;
      try {
        final placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);
        if (placemarks.isNotEmpty) {
          final place = placemarks[0];
          String street = place.street ?? '';
          if (street.contains('+')) street = place.name ?? '';
          if (street.contains('+')) street = '';
          final parts = <String>{
            if (street.isNotEmpty) street,
            if ((place.subLocality ?? '').isNotEmpty) place.subLocality!,
            if ((place.locality ?? '').isNotEmpty) place.locality!,
          }.toList();
          locationName = parts.isNotEmpty ? parts.join(', ') : l10n.locationCaptured;
        }
      } catch (_) {
        locationName = '${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)}';
      }

      if (isClockIn) {
        final result = await _attendanceService.clockIn(
          position.latitude,
          position.longitude,
          address: locationName,
          accuracy: position.accuracy,
        );
        _statusMessage = l10n.clockedInAt(locationName);
        _isSuccess = true;

        // Check if the response says they were marked late
        final isLate = result['data']?['is_late'] == true || result['data']?['is_late'] == 1;
        await _loadData();

        if (isLate && mounted) {
          _showLateReasonDialog();
        }
      } else {
        await _attendanceService.clockOut(
          position.latitude,
          position.longitude,
          address: locationName,
          accuracy: position.accuracy,
        );
        _statusMessage = l10n.clockedOutFrom(locationName);
        _isSuccess = true;
        await _loadData();
      }
    } catch (e) {
      if (!mounted) return;
      _statusMessage = friendlyError(context, e);
      _isSuccess = false;
    } finally {
      if (mounted) setState(() {});
    }
  }

  void _showLateReasonDialog() {
    final controller = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
                ),
              ),
              Row(
                children: [
                  const Icon(LucideIcons.alertTriangle, color: Colors.orange, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    AppLocalizations.of(context)!.youClockedInLate,
                    style: GoogleFonts.notoSansKhmer(fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                AppLocalizations.of(context)!.provideLateReasonOptional,
                style: GoogleFonts.notoSansKhmer(fontSize: 13, color: Colors.grey[600]),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: AppLocalizations.of(context)!.lateReasonHint,
                  hintStyle: GoogleFonts.notoSansKhmer(fontSize: 13, color: Colors.grey),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                style: GoogleFonts.notoSansKhmer(fontSize: 14),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(AppLocalizations.of(context)!.skip, style: GoogleFonts.notoSansKhmer()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        final reason = controller.text.trim();
                        if (reason.isEmpty) {
                          Navigator.pop(ctx);
                          return;
                        }
                        try {
                          await _attendanceService.submitLateReason(reason);
                          if (ctx.mounted) Navigator.pop(ctx);
                          await _loadData();
                        } catch (e) {
                          if (ctx.mounted) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              SnackBar(content: Text(friendlyError(ctx, e))),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(AppLocalizations.of(context)!.submit, style: GoogleFonts.notoSansKhmer()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  void _showMyDocuments(BuildContext context, dynamic attachments) {
    List docs = (attachments is List) ? attachments : [];

    final personalDocs = docs.where((doc) {
      if (doc == null || doc['name'] == null) return false;
      final name = doc['name'].toString().toLowerCase();
      final workKeywords = ['contract', 'agreement', 'policy', 'handbook', 'nda', 'company', 'work', 'employment', 'business', 'notice', 'announcement', 'task'];
      if (workKeywords.any((k) => name.contains(k))) return false;
      final personalKeywords = ['national id', 'degree', 'certificate', 'cv', 'resume', 'passport', 'id card', 'birth certificate', 'family book', 'diploma', 'transcript', 'personal', 'academic', 'qualification', 'educational', 'license', 'engineering', 'study'];
      return personalKeywords.any((k) => name.contains(k));
    }).toList();

    final workDocs = docs.where((doc) => !personalDocs.contains(doc)).toList();

    Widget buildDocTile(dynamic doc) {
      return ListTile(
        contentPadding: EdgeInsets.zero,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.indigo.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(LucideIcons.fileText, color: Colors.indigo, size: 20),
        ),
        title: Text(doc['name'] ?? AppLocalizations.of(context)!.documentFallbackName, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 14)),
        trailing: const Icon(LucideIcons.externalLink, size: 16, color: Colors.grey),
        onTap: () async {
          final fallbackName = AppLocalizations.of(context)!.documentFallbackName;
          String? fileUrl = doc['url'];
          String? documentPath = doc['path'] ?? doc['file_path'];
          if (fileUrl == null && documentPath != null) {
            fileUrl = '${AppConstants.storageUrl}/$documentPath';
          }
          if (fileUrl != null) {
            Navigator.of(context, rootNavigator: true).push(
              MaterialPageRoute(
                builder: (context) => DocumentViewerScreen(fileUrl: fileUrl!, fileName: doc['name'] ?? fallbackName),
              ),
            );
          }
        },
      );
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4, margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Text(AppLocalizations.of(context)!.myAttachedDocuments, style: GoogleFonts.notoSansKhmer(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            if (workDocs.isEmpty)
              Expanded(child: Center(child: Text(AppLocalizations.of(context)!.noDocumentsFound, style: GoogleFonts.notoSansKhmer(color: Colors.grey))))
            else
              Expanded(child: ListView(children: workDocs.map((doc) => buildDocTile(doc)).toList())),
          ],
        ),
      ),
    );
  }

  String _formatTime(String? isoString) {
    if (isoString == null) return '--:--';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final m = dt.minute.toString().padLeft(2, '0');
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      return '$h:$m $period';
    } catch (_) {
      return '--:--';
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayUser = _loading ? {
      'name': 'Loading Name...',
      'needs_password_change': false,
      'employee': {'employee_code': 'EMP000', 'shift': null}
    } : _user;

    if (!_loading && _user == null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(LucideIcons.wifiOff, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                Text(AppLocalizations.of(context)!.unableToConnect, style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                const SizedBox(height: 8),
                Text(
                  AppLocalizations.of(context)!.checkYourInternet,
                  style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey),
                  textAlign: TextAlign.center,
                ),
                // Technical details are only shown in debug builds (USB debugging),
                // never in the release APK.
                if (kDebugMode) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Debug: ${_connectionError ?? 'no error details'}\nServer: ${AppConstants.baseUrl}',
                    style: GoogleFonts.notoSansKhmer(fontSize: 11, color: Colors.blueGrey, fontStyle: FontStyle.italic),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () { setState(() { _loading = true; _connectionError = null; }); _loadData(); },
                  icon: const Icon(LucideIcons.refreshCw),
                  label: Text(AppLocalizations.of(context)!.retryConnection),
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final hasClockedIn  = _todayAttendance?['clock_in'] != null;
    final hasClockedOut = _todayAttendance?['clock_out'] != null;
    final todayStatus   = _todayAttendance?['status'] as String?;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: Skeletonizer(
        enabled: _loading,
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 40),

                if (displayUser?['needs_password_change'] == true)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.amber[50],
                      border: Border.all(color: Colors.amber),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.alertTriangle, color: Colors.amber),
                        const SizedBox(width: 12),
                        Expanded(child: Text(AppLocalizations.of(context)!.changeGeneratedPassword, style: GoogleFonts.notoSansKhmer(color: Colors.amber[900], fontSize: 13))),
                        TextButton(onPressed: () => context.go('/profile?openPassword=true'), child: Text(AppLocalizations.of(context)!.go)),
                      ],
                    ),
                  ),

                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6),
                            shape: BoxShape.circle,
                            boxShadow: [BoxShadow(color: const Color(0xFF3B82F6).withValues(alpha: 0.35), blurRadius: 10, offset: const Offset(0, 3))],
                          ),
                          child: ClipOval(
                            child: Image.asset('assets/logo.png', height: 38, width: 38, fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(Icons.business, size: 30, color: Colors.white),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('HEN CHEN', style: GoogleFonts.notoSansKhmer(fontSize: 17, fontWeight: FontWeight.w800, color: const Color(0xFF1E293B), letterSpacing: 0.5)),
                            Text(AppLocalizations.of(context)!.hrPortal, style: GoogleFonts.notoSansKhmer(fontSize: 11, fontWeight: FontWeight.w500, color: Colors.grey.shade500)),
                          ],
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Consumer<NotificationProvider>(
                          builder: (context, notifProvider, _) => GestureDetector(
                            onTap: () => context.push('/notifications'),
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Container(
                                  width: 42, height: 42,
                                  decoration: BoxDecoration(
                                    color: Colors.white, shape: BoxShape.circle,
                                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.07), blurRadius: 8, offset: const Offset(0, 2))],
                                  ),
                                  child: const Icon(LucideIcons.bell, size: 20, color: Color(0xFF3B82F6)),
                                ),
                                if (notifProvider.unreadCount > 0)
                                  Positioned(
                                    top: -2, right: -2,
                                    child: Container(
                                      padding: const EdgeInsets.all(3),
                                      decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                                      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                                      child: Text(
                                        notifProvider.unreadCount > 9 ? '9+' : '${notifProvider.unreadCount}',
                                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        CircleAvatar(
                          backgroundColor: Colors.blue,
                          backgroundImage: displayUser?['employee']?['profile_picture_url'] != null
                              ? NetworkImage(displayUser!['employee']['profile_picture_url'])
                              : null,
                          child: displayUser?['employee']?['profile_picture_url'] == null
                              ? Text(displayUser?['name']?[0] ?? 'U', style: const TextStyle(color: Colors.white))
                              : null,
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Welcome Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF2563EB)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [BoxShadow(color: Colors.blue.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 5))],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(AppLocalizations.of(context)!.welcomeBack, style: GoogleFonts.notoSansKhmer(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            Text(displayUser?['name'] ?? AppLocalizations.of(context)!.employeeFallback, style: GoogleFonts.notoSansKhmer(color: Colors.white, fontSize: 16)),
                            Text(displayUser?['employee']?['employee_code'] ?? AppLocalizations.of(context)!.employeeIdFallback, style: GoogleFonts.notoSansKhmer(color: Colors.white70, fontSize: 14)),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(12)),
                              child: Text(
                                displayUser?['employee']?['shift'] != null
                                  ? () {
                                      final st = displayUser!['employee']['shift']['start_time']?.toString() ?? '';
                                      final et = displayUser['employee']['shift']['end_time']?.toString() ?? '';
                                      final s = st.length >= 5 ? st.substring(0, 5) : st;
                                      final e = et.length >= 5 ? et.substring(0, 5) : et;
                                      return AppLocalizations.of(context)!.shiftTime(s, e);
                                    }()
                                  : (displayUser?['employee']?['job_title'] != null
                                      ? AppLocalizations.of(context)!.roleLabel(displayUser!['employee']['job_title'])
                                      : AppLocalizations.of(context)!.standardShift),
                                style: GoogleFonts.notoSansKhmer(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(LucideIcons.partyPopper, color: Colors.white, size: 60),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Today's Attendance section
                Text(AppLocalizations.of(context)!.todaysAttendance, style: GoogleFonts.notoSansKhmer(color: Colors.black54, fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),

                // Current state card
                if (!_loading)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: hasClockedIn ? (hasClockedOut ? Colors.grey[100] : Colors.green[50]) : Colors.orange[50],
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: hasClockedIn ? (hasClockedOut ? Colors.grey[300]! : Colors.green[200]!) : Colors.orange[200]!,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          hasClockedIn ? (hasClockedOut ? LucideIcons.checkCircle2 : LucideIcons.logIn) : LucideIcons.clock,
                          color: hasClockedIn ? (hasClockedOut ? Colors.grey : Colors.green) : Colors.orange,
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: hasClockedIn
                            ? Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    hasClockedOut ? AppLocalizations.of(context)!.completedForToday : AppLocalizations.of(context)!.currentlyClockedIn,
                                    style: GoogleFonts.notoSansKhmer(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87),
                                  ),
                                  Text(
                                    hasClockedOut
                                      ? AppLocalizations.of(context)!.inOutTimes(_formatTime(_todayAttendance!['clock_in']), _formatTime(_todayAttendance!['clock_out']))
                                      : AppLocalizations.of(context)!.sinceTime(_formatTime(_todayAttendance!['clock_in'])),
                                    style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.black54),
                                  ),
                                  if (hasClockedOut && _canUndoClockOut)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: GestureDetector(
                                        onTap: _handleUndoClockOut,
                                        child: Text(
                                          AppLocalizations.of(context)!.clockedOutByMistakeUndo,
                                          style: GoogleFonts.notoSansKhmer(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.blue[700],
                                            decoration: TextDecoration.underline,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              )
                            : Text(AppLocalizations.of(context)!.notClockedInYet, style: GoogleFonts.notoSansKhmer(fontSize: 13, color: Colors.orange[800])),
                        ),
                        if (todayStatus != null)
                          _StatusChip(status: todayStatus),
                      ],
                    ),
                  ),

                if (_statusMessage != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: Text(_statusMessage!, style: TextStyle(color: _isSuccess ? Colors.green : Colors.red, fontSize: 13)),
                  ),

                // Clock In / Out buttons
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: hasClockedIn ? null : () => _handleAttendance(true),
                        borderRadius: BorderRadius.circular(20),
                        child: Opacity(
                          opacity: hasClockedIn ? 0.45 : 1.0,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
                              boxShadow: [BoxShadow(color: Colors.green.withValues(alpha: 0.05), blurRadius: 10)],
                            ),
                            child: Column(
                              children: [
                                const Icon(LucideIcons.logIn, color: Colors.green, size: 32),
                                const SizedBox(height: 8),
                                Text(AppLocalizations.of(context)!.checkIn, style: GoogleFonts.notoSansKhmer(color: Colors.black87, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: InkWell(
                        onTap: (hasClockedIn && !hasClockedOut) ? () => _handleAttendance(false) : null,
                        borderRadius: BorderRadius.circular(20),
                        child: Opacity(
                          opacity: (hasClockedIn && !hasClockedOut) ? 1.0 : 0.45,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                              boxShadow: [BoxShadow(color: Colors.orange.withValues(alpha: 0.05), blurRadius: 10)],
                            ),
                            child: Column(
                              children: [
                                const Icon(LucideIcons.logOut, color: Colors.orange, size: 32),
                                const SizedBox(height: 8),
                                Text(AppLocalizations.of(context)!.checkOut, style: GoogleFonts.notoSansKhmer(color: Colors.black87, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Payslip quick access
                GestureDetector(
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PayslipScreen())),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                      boxShadow: [BoxShadow(color: const Color(0xFF10B981).withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4))],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.1), shape: BoxShape.circle),
                          child: const Icon(LucideIcons.receipt, color: Color(0xFF10B981), size: 24),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(AppLocalizations.of(context)!.myPayslips, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold, fontSize: 16, color: const Color(0xFF1E293B))),
                              Text(AppLocalizations.of(context)!.viewSalarySlips, style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.grey.shade600)),
                            ],
                          ),
                        ),
                        const Icon(LucideIcons.chevronRight, color: Colors.grey),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                Text(AppLocalizations.of(context)!.features, style: GoogleFonts.notoSansKhmer(color: Colors.black54, fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _QuickActionIcon(icon: LucideIcons.fileText, color: const Color(0xFF10B981), title: AppLocalizations.of(context)!.myDocuments, onTap: () => _showMyDocuments(context, _user?['employee']?['documents']?['attachments']))),
                    Expanded(child: _QuickActionIcon(icon: LucideIcons.calendarDays, color: const Color(0xFF8B5CF6), title: AppLocalizations.of(context)!.holidaysEvents, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HolidayScreen())))),
                    Expanded(child: _QuickActionIcon(icon: LucideIcons.clock, color: const Color(0xFFF43F5E), title: AppLocalizations.of(context)!.overtime, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OvertimeScreen())))),
                    Expanded(child: _QuickActionIcon(icon: LucideIcons.clipboardList, color: const Color(0xFF3B82F6), title: AppLocalizations.of(context)!.attendanceHistory, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceHistoryScreen())))),
                  ],
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Small colored chip for attendance status
class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final config = _statusConfig(context, status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: config.$1.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(config.$2, style: GoogleFonts.notoSansKhmer(fontSize: 11, fontWeight: FontWeight.w600, color: config.$1)),
    );
  }

  static (Color, String) _statusConfig(BuildContext context, String status) {
    final l10n = AppLocalizations.of(context)!;
    return switch (status) {
      'present'   => (Colors.green,        l10n.statusPresent),
      'late'      => (Colors.orange,       l10n.statusLate),
      'early_out' => (const Color(0xFFF59E0B), l10n.statusEarlyOut),
      'warning'   => (Colors.red,          l10n.statusWarning),
      'absent'    => (Colors.red,          l10n.statusAbsent),
      _           => (Colors.grey,         status),
    };
  }
}

class _QuickActionIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final VoidCallback onTap;

  const _QuickActionIcon({required this.icon, required this.color, required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(4.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 8),
            Text(title, textAlign: TextAlign.center, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 11, color: Colors.black87, height: 1.2), maxLines: 2, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}
