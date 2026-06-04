import 'package:flutter/material.dart';
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
          _error = e.message ?? "Failed to load history";
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
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
              ? Center(child: Text("Error: $_error", style: const TextStyle(color: Colors.red)))
              : _attendanceHistory.isEmpty
                  ? Center(
                      child: Text(
                        "No attendance records found.",
                        style: GoogleFonts.notoSansKhmer(color: Colors.grey),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadHistory,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: _attendanceHistory.length,
                        itemBuilder: (context, index) {
                          final att = _attendanceHistory[index];
                          
                          String formatTime(String? timeStr) {
                            if (timeStr == null || timeStr.isEmpty) return '--:--';
                            try {
                              final dt = DateTime.parse(timeStr).toLocal();
                              return DateFormat('h:mm a').format(dt);
                            } catch (e) {
                              if (timeStr.length >= 5) return timeStr.substring(0, 5);
                              return timeStr;
                            }
                          }

                          String formatDate(String? dateStr) {
                            if (dateStr == null || dateStr.isEmpty) return '';
                            try {
                              final dt = DateTime.parse(dateStr).toLocal();
                              return DateFormat('dd MMMM yyyy').format(dt);
                            } catch (e) {
                              return dateStr.split('T')[0];
                            }
                          }

                          final dateStr = formatDate(att['date']);
                          final clockInTime = formatTime(att['clock_in']);
                          final clockOutTime = formatTime(att['clock_out']);
                          
                          final bool isLate = att['is_late'] == 1 || att['is_late'] == true;
                          final clockInStatus = isLate ? 'Late' : 'Good';
                          final clockInColor = isLate ? Colors.orange : Colors.green;
                          
                          final clockOutStatus = att['clock_out'] != null ? 'Good' : '--';
                          final clockOutColor = att['clock_out'] != null ? Colors.blue : Colors.grey;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 24),
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
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(AppLocalizations.of(context)!.checkIn, style: GoogleFonts.notoSansKhmer(fontSize: 13, color: Colors.grey[600])),
                                        const SizedBox(height: 4),
                                        Text(clockInTime, style: GoogleFonts.notoSansKhmer(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87)),
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        Container(
                                          width: 10,
                                          height: 10,
                                          decoration: BoxDecoration(
                                            color: clockInColor,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Text(clockInStatus, style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.black87, fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                  ],
                                ),
                                
                                const SizedBox(height: 24),
                                
                                // Check-out Row
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(AppLocalizations.of(context)!.checkOut, style: GoogleFonts.notoSansKhmer(fontSize: 13, color: Colors.grey[600])),
                                        const SizedBox(height: 4),
                                        Text(clockOutTime, style: GoogleFonts.notoSansKhmer(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87)),
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        Container(
                                          width: 10,
                                          height: 10,
                                          decoration: BoxDecoration(
                                            color: clockOutColor,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Text(clockOutStatus, style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.black87, fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
