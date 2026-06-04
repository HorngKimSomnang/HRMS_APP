import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class AttendanceReportScreen extends StatelessWidget {
  final Map<String, dynamic> attendance;

  const AttendanceReportScreen({super.key, required this.attendance});

  String _formatTime(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return '--:--';
    try {
      final DateTime dt = DateTime.parse(timeStr).toLocal();
      return DateFormat('h:mm a').format(dt);
    } catch (e) {
      // Fallback if it's just 'HH:mm:ss'
      if (timeStr.length >= 5) {
        return timeStr.substring(0, 5);
      }
      return timeStr;
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final DateTime dt = DateTime.parse(dateStr).toLocal();
      return DateFormat('dd MMMM yyyy').format(dt);
    } catch (e) {
      return dateStr.split('T')[0];
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = _formatDate(attendance['date']);
    final clockInTime = _formatTime(attendance['clock_in']);
    final clockOutTime = _formatTime(attendance['clock_out']);
    
    // Logic for early/late (hardcoded 'Good'/'Late' for now based on 'is_late')
    final bool isLate = attendance['is_late'] == 1 || attendance['is_late'] == true;
    final clockInStatus = isLate ? 'Late' : 'Good';
    final clockInColor = isLate ? Colors.orange : Colors.green;
    
    // We assume check-out is 'Good' if it exists
    final clockOutStatus = attendance['clock_out'] != null ? 'Good' : '--';
    final clockOutColor = attendance['clock_out'] != null ? Colors.blue : Colors.grey;

    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: Text(
          'Attendance Report',
          style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold, color: Colors.black87),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Container(
          width: double.infinity,
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                dateStr,
                style: GoogleFonts.notoSansKhmer(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 24),
              
              // Check-in Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Check-in :', style: GoogleFonts.notoSansKhmer(fontSize: 15, color: Colors.black87)),
                  Row(
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: clockInColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(clockInStatus, style: GoogleFonts.notoSansKhmer(fontSize: 15, color: Colors.black87)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Time: $clockInTime',
                style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              
              const SizedBox(height: 24),
              
              // Check-out Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Check-out :', style: GoogleFonts.notoSansKhmer(fontSize: 15, color: Colors.black87)),
                  Row(
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: clockOutColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(clockOutStatus, style: GoogleFonts.notoSansKhmer(fontSize: 15, color: Colors.black87)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Time: $clockOutTime',
                style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
