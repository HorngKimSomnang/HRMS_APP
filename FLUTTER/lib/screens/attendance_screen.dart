import 'package:flutter/material.dart';

import '../core/error_utils.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/location_service.dart';
import '../services/attendance_service.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> with SingleTickerProviderStateMixin {
  final LocationService _locationService = LocationService();
  final AttendanceService _attendanceService = AttendanceService();
  
  bool _loading = false;
  String? _statusMessage;
  bool _isSuccess = false;

  // Animation for pulse effect (optional)
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
       vsync: this,
       duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleAttendance(bool isClockIn) async {
    setState(() {
      _loading = true;
      _statusMessage = "Getting location...";
      _isSuccess = false;
    });

    try {
      final position = await _locationService.getCurrentPosition();
      if (position == null) {
        throw Exception("Location permission denied or GPS disabled");
      }

      setState(() => _statusMessage = "Submitting to server...");

      if (isClockIn) {
        await _attendanceService.clockIn(position.latitude, position.longitude);
        _statusMessage = "Clocked In Successfully!";
      } else {
        await _attendanceService.clockOut(position.latitude, position.longitude);
        _statusMessage = "Clocked Out Successfully!";
      }
      _isSuccess = true;

    } catch (e) {
      if (!mounted) return;
      _statusMessage = friendlyError(context, e);
      _isSuccess = false;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text('Attendance', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600)),
        centerTitle: true,
        automaticallyImplyLeading: false, // Removed unnecessary back button
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
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 20),
              
              // 1. Live Location Card
              Container(
                height: 200,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.blue.shade100),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        // Pulse Effect
                        ScaleTransition(
                           scale: Tween(begin: 0.8, end: 1.2).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut)),
                           child: Container(
                             width: 80, height: 80,
                             decoration: BoxDecoration(color: Colors.blue.withValues(alpha:0.2), shape: BoxShape.circle),
                           ),
                        ),
                        const Icon(LucideIcons.mapPin, size: 48, color: Colors.blue),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Your Live Location',
                      style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blue[900]),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Ensure you are at the office',
                      style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.blue[700]),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 32),
              
              if (_statusMessage != null)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: _isSuccess ? Colors.green.shade50 : Colors.red.shade50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: _isSuccess ? Colors.green.shade200 : Colors.red.shade200,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _isSuccess ? LucideIcons.checkCircle : LucideIcons.alertCircle,
                        color: _isSuccess ? Colors.green : Colors.red,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _statusMessage!,
                          style: GoogleFonts.notoSansKhmer(
                            color: _isSuccess ? Colors.green.shade900 : Colors.red.shade900,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // 2. Large Clock In / Clock Out Buttons
              Row(
                children: [
                  Expanded(
                    child: _BigButton(
                      label: 'CLOCK IN',
                      icon: LucideIcons.logIn,
                      color: Colors.green,
                      isLoading: _loading,
                      onTap: () => _handleAttendance(true),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _BigButton(
                      label: 'CLOCK OUT',
                      icon: LucideIcons.logOut,
                      color: Colors.red,
                      isLoading: _loading,
                      onTap: () => _handleAttendance(false),
                    ),
                  ),
                ],
              ),
               
              const SizedBox(height: 30),
              
              // 3. Your Week Schedule
              const SizedBox(height: 20),
              Align(
                alignment: Alignment.centerLeft, 
                child: Text('Your Week', style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.w600))
              ),
              const SizedBox(height: 12),
              Column(
                children: [
                  _ScheduleRow('SAT', '08:00 - 16:00', 'Off Duty', Colors.red),
                  _ScheduleRow('SUN', '08:00 - 16:00', 'On Duty', Colors.blue),
                  _ScheduleRow('MON', '08:00 - 16:00', 'On Duty', Colors.blue),
                  _ScheduleRow('TUE', '08:00 - 16:00', 'On Duty', Colors.blue),
                  _ScheduleRow('WED', '08:00 - 16:00', 'On Duty', Colors.blue),
                  _ScheduleRow('THU', '08:00 - 16:00', 'On Duty', Colors.blue),
                  _ScheduleRow('FRI', '08:00 - 16:00', 'Off Duty', Colors.red),
                ],
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScheduleRow extends StatelessWidget {
  final String day;
  final String time;
  final String status;
  final Color color;

  const _ScheduleRow(this.day, this.time, this.status, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha:0.05), blurRadius: 5)],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          SizedBox(
            width: 40,
            child: Text(day, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey[800])),
          ),
          Text(time, style: GoogleFonts.notoSansKhmer(fontSize: 13, color: Colors.grey[600])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha:0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(status, style: GoogleFonts.notoSansKhmer(fontSize: 11, fontWeight: FontWeight.bold, color: color)),
          ),
        ],
      ),
    );
  }
}

class _BigButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool isLoading;
  final VoidCallback onTap;

  const _BigButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.isLoading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      elevation: 4,
      shadowColor: color.withValues(alpha:0.1),
      child: InkWell(
        onTap: isLoading ? null : onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          height: 160, // Large square button
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withValues(alpha:0.1), width: 2), // Subtle colored border
            color: Colors.white,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1), // very light background
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 32),
              ),
              const SizedBox(height: 16),
              Text(
                label,
                style: GoogleFonts.notoSansKhmer(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
