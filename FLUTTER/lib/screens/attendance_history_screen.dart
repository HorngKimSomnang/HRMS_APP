import 'package:flutter/material.dart';

import '../core/error_utils.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../l10n/app_localizations.dart';

class AttendanceHistoryScreen extends StatefulWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  State<AttendanceHistoryScreen> createState() => _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen> {
  final ApiService _apiService = ApiService();
  bool _loading = true;
  List<dynamic> _attendanceHistory = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final response = await _apiService.client.get('/attendance/history');
      if (mounted) {
        setState(() {
          _attendanceHistory = response.data['data'] ?? [];
          _loading = false;
        });
      }
    } on DioException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message ?? 'Failed to load history';
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = friendlyError(context, e);
          _loading = false;
        });
      }
    }
  }

  String _formatTime(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return '--:--';
    try {
      return DateFormat('h:mm a').format(DateTime.parse(timeStr).toLocal());
    } catch (_) {
      return timeStr.length >= 5 ? timeStr.substring(0, 5) : timeStr;
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      return DateFormat('dd MMMM yyyy').format(DateTime.parse(dateStr).toLocal());
    } catch (_) {
      return dateStr.split('T')[0];
    }
  }

  // Returns (color, label, icon) for a given attendance status
  ({Color color, String label, IconData icon}) _statusConfig(String? status, bool isLate) {
    if (status == null || status.isEmpty) {
      return (color: Colors.grey, label: '—', icon: Icons.help_outline);
    }
    return switch (status) {
      'present'   => (color: const Color(0xFF10B981), label: 'Present',   icon: Icons.check_circle_outline),
      'late'      => (color: Colors.orange,            label: 'Late',      icon: Icons.access_time),
      'early_out' => (color: const Color(0xFFF59E0B),  label: 'Early Out', icon: Icons.logout),
      'warning'   => (color: Colors.red,               label: 'Warning',   icon: Icons.warning_amber_rounded),
      'absent'    => (color: Colors.red,               label: 'Absent',    icon: Icons.cancel_outlined),
      _           => (color: Colors.grey,              label: status,      icon: Icons.help_outline),
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(
          AppLocalizations.of(context)!.attendanceHistory,
          style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold, color: Colors.black87),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Error: $_error', style: const TextStyle(color: Colors.red)))
              : _attendanceHistory.isEmpty
                  ? Center(child: Text('No attendance records found.', style: GoogleFonts.notoSansKhmer(color: Colors.grey)))
                  : RefreshIndicator(
                      onRefresh: _loadHistory,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: _attendanceHistory.length,
                        itemBuilder: (context, index) {
                          final att = _attendanceHistory[index];
                          final status = att['status'] as String?;
                          final isLate = att['is_late'] == 1 || att['is_late'] == true;
                          final cfg = _statusConfig(status, isLate);

                          final clockInTime  = _formatTime(att['clock_in']);
                          final clockOutTime = _formatTime(att['clock_out']);
                          final dateStr      = _formatDate(att['date']);
                          final hoursWorked  = att['hours_worked'] as String?;
                          final lateReason       = att['late_reason'] as String?;
                          final earlyOutReason    = att['early_out_reason'] as String?;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
                            ),
                            child: Column(
                              children: [
                                // Header row: date + status chip
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                                  decoration: BoxDecoration(
                                    color: cfg.color.withValues(alpha: 0.06),
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(dateStr, style: GoogleFonts.notoSansKhmer(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87)),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: cfg.color.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(cfg.icon, size: 13, color: cfg.color),
                                            const SizedBox(width: 4),
                                            Text(cfg.label, style: GoogleFonts.notoSansKhmer(fontSize: 12, fontWeight: FontWeight.w600, color: cfg.color)),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                // Clock In / Out times
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                                  child: Row(
                                    children: [
                                      _TimeBlock(label: AppLocalizations.of(context)!.checkIn, time: clockInTime, color: Colors.green),
                                      const Padding(
                                        padding: EdgeInsets.symmetric(horizontal: 12),
                                        child: Icon(Icons.arrow_forward, color: Colors.grey, size: 18),
                                      ),
                                      _TimeBlock(label: AppLocalizations.of(context)!.checkOut, time: clockOutTime, color: Colors.orange),
                                      if (hoursWorked != null && hoursWorked != '-') ...[
                                        const Spacer(),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Text('Hours', style: GoogleFonts.notoSansKhmer(fontSize: 11, color: Colors.grey)),
                                            Text(hoursWorked, style: GoogleFonts.notoSansKhmer(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF3B82F6))),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                ),

                                // Reason notes (only shown when relevant)
                                if (lateReason != null && lateReason.isNotEmpty)
                                  _ReasonBanner(icon: Icons.access_time, color: Colors.orange, text: 'Late reason: $lateReason'),
                                if (earlyOutReason == 'System auto clock-out')
                                  _ReasonBanner(icon: Icons.computer_outlined, color: const Color(0xFF3B82F6), text: 'Auto clocked out by system at shift end')
                                else if (earlyOutReason != null && earlyOutReason.isNotEmpty && !earlyOutReason.startsWith('Auto-detected'))
                                  _ReasonBanner(icon: Icons.logout, color: const Color(0xFFF59E0B), text: 'Early out: $earlyOutReason'),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

class _TimeBlock extends StatelessWidget {
  final String label;
  final String time;
  final Color color;
  const _TimeBlock({required this.label, required this.time, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.notoSansKhmer(fontSize: 11, color: Colors.grey[600])),
        const SizedBox(height: 2),
        Text(
          time,
          style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold, color: time == '--:--' ? Colors.grey[400] : Colors.black87),
        ),
      ],
    );
  }
}

class _ReasonBanner extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String text;
  const _ReasonBanner({required this.icon, required this.color, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.black54))),
        ],
      ),
    );
  }
}
