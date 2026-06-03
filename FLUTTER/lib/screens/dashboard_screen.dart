import 'package:flutter/material.dart';
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
import 'payroll_screen.dart';
import 'payslip_screen.dart';
import 'overtime_screen.dart';
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
  bool _loading = true;
  String? _statusMessage;
  bool _isSuccess = false;
  String? _connectionError; // Added to track specific network error
  
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final LocalNotificationService _notificationService = LocalNotificationService();

  @override
  void initState() {
    super.initState();
    _loadData();
    // Load notification badge count
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final notifProvider = context.read<NotificationProvider>();
        notifProvider.fetchNotifications();
        notifProvider.startPolling(); // Start listening for live alerts
      }
    });
    _requestNotificationPermission();
    _loadNotices();
  }

  Future<void> _requestNotificationPermission() async {
    final status = await Permission.notification.status;
    if (status.isDenied) {
      await Permission.notification.request();
    }
  }

  Future<void> _loadNotices() async {
    try {
      final response = await _apiService.client.get('/announcements/latest');
      final notices = response.data['data'] as List<dynamic>;
      
      // Simulate Push Notification for new notice
      if (notices.isNotEmpty) {
        final latestNotice = notices.first;
        final latestNoticeId = latestNotice['id'].toString();
        
        final lastSeenId = await _storage.read(key: 'last_seen_notice_id');
        
        if (lastSeenId != latestNoticeId) {
          // Trigger local notification
          await _notificationService.showNotification(
            id: latestNotice['id'],
            title: 'New Announcement: ${latestNotice['title']}',
            body: latestNotice['content'],
          );
          await _storage.write(key: 'last_seen_notice_id', value: latestNoticeId);
        }
      }
    } catch (e) {
      // Ignore error loading notices silently
    }
  }

  Future<void> _loadData() async {
    try {
      final userResponse = await _apiService.client.get('/user');
      if (mounted) {
        setState(() {
          _user = userResponse.data;
          _loading = false;
          _connectionError = null;
        });
      }
    } on DioException catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _connectionError = e.message ?? "Connection timeout";
        });
        
        // If the token is invalid (401), send them back to login
        if (e.response?.statusCode == 401) {
          context.go('/login');
        }
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

  Future<void> _handleAttendance(bool isClockIn) async {
    setState(() {
      _statusMessage = "Getting location...";
      _isSuccess = false;
    });

    try {
      final position = await _locationService.getCurrentPosition();
      if (position == null) {
        throw Exception("Location permission denied");
      }

      setState(() => _statusMessage = "Submitting...");

      String locationName = "Unknown Location";
      try {
        List<Placemark> placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);
        if (placemarks.isNotEmpty) {
           Placemark place = placemarks[0];
           String street = place.street ?? '';
           if (street.contains('+')) {
               street = place.name ?? '';
               if (street.contains('+')) street = '';
           }
           List<String> parts = [];
           if (street.isNotEmpty) parts.add(street);
           if (place.subLocality != null && place.subLocality!.isNotEmpty) parts.add(place.subLocality!);
           if (place.locality != null && place.locality!.isNotEmpty) parts.add(place.locality!);
           
           locationName = parts.where((e) => e.isNotEmpty).toSet().join(', ');
           if (locationName.isEmpty) locationName = "Location Captured";
        }
      } catch (e) {
        locationName = "${position.latitude.toStringAsFixed(2)}, ${position.longitude.toStringAsFixed(2)}";
      }

      if (isClockIn) {
        await _attendanceService.clockIn(position.latitude, position.longitude);
        _statusMessage = "Clocked In at: $locationName";
      } else {
        await _attendanceService.clockOut(position.latitude, position.longitude);
        _statusMessage = "Clocked Out from: $locationName";
      }
      _isSuccess = true;

    } catch (e) {
      _statusMessage = "Failed: ${e.toString().replaceAll("Exception: ", "")}";
      _isSuccess = false;
    } finally {
      if (mounted) setState(() {});
    }
  }

  void _showMyDocuments(BuildContext context, dynamic attachments) {
    List docs = (attachments is List) ? attachments : [];
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
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
              Text(
                'My Attached Documents',
                style: GoogleFonts.notoSansKhmer(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              if (docs.isEmpty)
                Expanded(child: Center(child: Text('No documents found.', style: GoogleFonts.notoSansKhmer(color: Colors.grey))))
              else
                Expanded(
                  child: ListView.builder(
                    itemCount: docs.length,
                    itemBuilder: (c, i) {
                      final doc = docs[i];
                      return ListTile(
                        leading: const Icon(LucideIcons.fileText, color: Colors.blue),
                        title: Text(doc['name'] ?? 'Document', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600)),
                        trailing: const Icon(LucideIcons.externalLink, size: 16),
                        onTap: () async {
                          String? fileUrl = doc['url'];
                          String? documentPath = doc['path'] ?? doc['file_path'];
                          
                          if (fileUrl == null && documentPath != null) {
                            fileUrl = '${AppConstants.storageUrl}/$documentPath';
                          }

                          if (fileUrl != null) {
                            Navigator.of(context, rootNavigator: true).push(
                              MaterialPageRoute(
                                builder: (context) => DocumentViewerScreen(
                                  fileUrl: fileUrl!,
                                  fileName: doc['name'] ?? 'Document',
                                ),
                              ),
                            );
                          }
                        },
                      );
                    },
                  ),
                ),
            ],
          ),
        );
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    // Mock user for skeleton loading
    final displayUser = _loading ? {
      'name': 'Loading Name...',
      'needs_password_change': false,
      'employee': {
        'employee_code': 'EMP000',
        'shift': null,
      }
    } : _user;

    // 2. Error State (Retry UI)
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
                Text(
                  AppLocalizations.of(context)!.unableToConnect,
                  style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  _connectionError != null 
                    ? "Error: $_connectionError" 
                    : "Check that 'php artisan serve' is running and Port 8000 is open.",
                  style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  "Current Config: ${AppConstants.baseUrl}",
                  style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.blueGrey, fontStyle: FontStyle.italic),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {
                    setState(() {
                      _loading = true;
                      _connectionError = null;
                    });
                    _loadData();
                  },
                  icon: const Icon(LucideIcons.refreshCw),
                  label: Text(AppLocalizations.of(context)!.retryConnection),
                  style: ElevatedButton.styleFrom(
                     padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                )
              ],
            ),
          ),
        ),
      );
    }

    // 3. Success State & Skeleton State (Dashboard)
    return Scaffold(
      backgroundColor: Colors.grey[50], // Light Background
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
                    border: Border.all(color: Colors.amber, width: 1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.alertTriangle, color: Colors.amber),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          "Please change your auto-generated password in your Profile immediately for security.",
                          style: GoogleFonts.notoSansKhmer(color: Colors.amber[900], fontSize: 13),
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.go('/profile'), // Switch tab instead of pushing
                        child: const Text('Go'),
                      )
                    ],
                  ),
                ),
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Company Logo + Name (BambooHR / Workday style)
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF3B82F6),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF3B82F6).withValues(alpha: 0.35),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: Image.asset(
                            'assets/logo.png',
                            height: 38,
                            width: 38,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.business,
                              size: 30,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'HEN CHEN',
                            style: GoogleFonts.notoSansKhmer(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF1E293B),
                              letterSpacing: 0.5,
                            ),
                          ),
                          Text(
                            'HR Portal',
                            style: GoogleFonts.notoSansKhmer(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      // Notification Bell with Badge
                      Consumer<NotificationProvider>(
                        builder: (context, notifProvider, _) {
                          return GestureDetector(
                            onTap: () => context.push('/notifications'),
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.07),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      )
                                    ],
                                  ),
                                  child: const Icon(LucideIcons.bell, size: 20, color: Color(0xFF3B82F6)),
                                ),
                                if (notifProvider.unreadCount > 0)
                                  Positioned(
                                    top: -2,
                                    right: -2,
                                    child: AnimatedScale(
                                      scale: 1.0,
                                      duration: const Duration(milliseconds: 300),
                                      child: Container(
                                        padding: const EdgeInsets.all(3),
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFEF4444),
                                          shape: BoxShape.circle,
                                        ),
                                        constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                                        child: Text(
                                          notifProvider.unreadCount > 9 ? '9+' : '${notifProvider.unreadCount}',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                          textAlign: TextAlign.center,
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
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
                  gradient: const LinearGradient(
                    colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.blue.withValues(alpha:0.3), blurRadius: 10, offset: const Offset(0, 5)),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(AppLocalizations.of(context)!.welcomeBack, style: GoogleFonts.notoSansKhmer(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          Text(displayUser?['name'] ?? 'Employee', style: GoogleFonts.notoSansKhmer(color: Colors.white, fontSize: 16)),
                          Text(displayUser?['employee']?['employee_code'] ?? 'ID: --', style: GoogleFonts.notoSansKhmer(color: Colors.white70, fontSize: 14)),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              displayUser?['employee']?['shift'] != null 
                              ? "Shift: ${displayUser!['employee']['shift']['start_time'].substring(0, 5)} - ${displayUser['employee']['shift']['end_time'].substring(0, 5)}"
                              : (displayUser?['employee']?['job_title'] != null ? "Role: ${displayUser!['employee']['job_title']}" : AppLocalizations.of(context)!.standardShift), 
                              style: GoogleFonts.notoSansKhmer(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)
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
              
              // Today's Attendance — Primary action
              Text(AppLocalizations.of(context)!.todaysAttendance, style: GoogleFonts.notoSansKhmer(color: Colors.black54, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              if (_statusMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: Text(_statusMessage!, style: TextStyle(color: _isSuccess ? Colors.green : Colors.red)),
                ),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _handleAttendance(true),
                      borderRadius: BorderRadius.circular(20),
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
                  const SizedBox(width: 16),
                  Expanded(
                    child: InkWell(
                      onTap: () => _handleAttendance(false),
                      borderRadius: BorderRadius.circular(20),
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
                ],
              ),

              const SizedBox(height: 20),

              // Payslip Quick Access Card
              GestureDetector(
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const PayslipScreen())),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                    boxShadow: [
                      BoxShadow(color: const Color(0xFF10B981).withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
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
                  Expanded(
                    child: _QuickActionIcon(
                      icon: LucideIcons.fileText,
                      color: const Color(0xFF10B981),
                      title: AppLocalizations.of(context)!.myDocuments,
                      onTap: () => _showMyDocuments(context, _user?['employee']?['documents']?['attachments']),
                    ),
                  ),
                  Expanded(
                    child: _QuickActionIcon(
                      icon: LucideIcons.calendarDays,
                      color: const Color(0xFF8B5CF6),
                      title: AppLocalizations.of(context)!.holidaysEvents,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const HolidayScreen())),
                    ),
                  ),
                  Expanded(
                    child: _QuickActionIcon(
                      icon: LucideIcons.wallet,
                      color: const Color(0xFF14B8A6),
                      title: AppLocalizations.of(context)!.requests,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const PayrollScreen(initialTabIndex: 0))),
                    ),
                  ),
                  Expanded(
                    child: _QuickActionIcon(
                      icon: LucideIcons.clock,
                      color: const Color(0xFFF43F5E),
                      title: AppLocalizations.of(context)!.overtime,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const OvertimeScreen())),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
      ),
    );
  }
}

class _QuickActionIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final VoidCallback onTap;

  const _QuickActionIcon({
    required this.icon, 
    required this.color, 
    required this.title, 
    required this.onTap
  });

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
              decoration: BoxDecoration(
                color: color.withValues(alpha:0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 8),
            Text(
              title, 
              textAlign: TextAlign.center, 
              style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 11, color: Colors.black87, height: 1.2),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
