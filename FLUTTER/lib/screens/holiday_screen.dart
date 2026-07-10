import 'package:flutter/material.dart';

import '../core/error_utils.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';

class HolidayScreen extends StatefulWidget {
  const HolidayScreen({super.key});

  @override
  State<HolidayScreen> createState() => _HolidayScreenState();
}

class _HolidayScreenState extends State<HolidayScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _holidays = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchHolidays();
  }

  Future<void> _fetchHolidays() async {
    try {
      final response = await _apiService.client.get('/announcements');
      // Handle standardized ApiResponse { status: true, data: [...] }
      final data = response.data['data'] is List ? response.data['data'] : response.data;
      
      setState(() {
        _holidays = data;
        _loading = false;
      });
      } catch (e) {
        if (!mounted) return;
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(context, e))),
        );
      }
    }
  
    @override
    Widget build(BuildContext context) {
      // Find next upcoming holiday
      final upcoming = _holidays.firstWhere(
        (h) {
          final dateStr = h['start_date'] ?? h['created_at'];
          if (dateStr == null) return false;
          return DateTime.parse(dateStr).isAfter(DateTime.now().subtract(const Duration(days: 1)));
        },
        orElse: () => null,
      );
  
      return Scaffold(
        backgroundColor: const Color(0xFFF3F4F6),
        appBar: AppBar(
          title: Text('Holidays & Events', style: GoogleFonts.notoSansKhmer(color: Colors.black, fontWeight: FontWeight.bold)),
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(LucideIcons.arrowLeft, color: Colors.black),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (upcoming != null) ...[
                      _buildUpcomingCard(upcoming),
                      const SizedBox(height: 24),
                    ],
                    Text(
                      'All Holidays', 
                      style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)
                    ),
                    const SizedBox(height: 16),
                    if (_holidays.isEmpty)
                      const Center(child: Text("No holidays found."))
                    else
                      ..._holidays.map((h) => _buildHolidayItem(h)),
                  ],
                ),
              ),
      );
    }
  
    Widget _buildUpcomingCard(dynamic holiday) {
      final dateStr = holiday['start_date'] ?? holiday['created_at'];
      final date = dateStr != null ? DateTime.parse(dateStr) : DateTime.now();
      final daysLeft = date.difference(DateTime.now()).inDays;
  
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF0EA5E9), Color(0xFF2563EB)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(color: const Color(0xFF2563EB).withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 10))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(LucideIcons.partyPopper, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Text('Coming Up Next', style: GoogleFonts.notoSansKhmer(color: Colors.white.withValues(alpha: 0.9), fontSize: 14)),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              holiday['title'] ?? 'Announcement',
              style: GoogleFonts.notoSansKhmer(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(LucideIcons.calendar, color: Colors.white, size: 16),
                const SizedBox(width: 8),
                Text(
                  DateFormat('EEEE, d MMMM y').format(date),
                  style: GoogleFonts.notoSansKhmer(color: Colors.white.withValues(alpha: 0.9), fontSize: 14),
                ),
              ],
            ),
             const SizedBox(height: 20),
             Container(
               padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
               decoration: BoxDecoration(
                 color: Colors.white.withValues(alpha: 0.2),
               borderRadius: BorderRadius.circular(30),
             ),
             child: Text(
               daysLeft == 0 ? 'Today' : '$daysLeft days left',
               style: GoogleFonts.notoSansKhmer(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
             ),
           )
        ],
      ),
    );
  }

  Widget _buildHolidayItem(dynamic holiday) {
    final dateStr = holiday['start_date'] ?? holiday['created_at'];
    final date = dateStr != null ? DateTime.parse(dateStr) : DateTime.now();
    final bool isPublic = holiday['type']?.toString().toLowerCase() == 'holiday';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isPublic ? Colors.blue.shade50 : Colors.purple.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Text(
                  DateFormat('d').format(date),
                  style: GoogleFonts.notoSansKhmer(
                    fontSize: 20, 
                    fontWeight: FontWeight.bold, 
                    color: isPublic ? Colors.blue.shade700 : Colors.purple.shade700
                  ),
                ),
                Text(
                  DateFormat('MMM').format(date).toUpperCase(),
                  style: GoogleFonts.notoSansKhmer(
                    fontSize: 12, 
                    fontWeight: FontWeight.bold, 
                    color: isPublic ? Colors.blue.shade700 : Colors.purple.shade700
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  holiday['title'] ?? 'Announcement',
                  style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: isPublic ? Colors.blue.shade50 : Colors.purple.shade50,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: isPublic ? Colors.blue.shade100 : Colors.purple.shade100),
                      ),
                      child: Text(
                        (holiday['type']?.toString() ?? 'event').toUpperCase(),
                        style: GoogleFonts.notoSansKhmer(
                          fontSize: 10, 
                          fontWeight: FontWeight.bold, 
                          color: isPublic ? Colors.blue.shade700 : Colors.purple.shade700
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      DateFormat('EEEE').format(date),
                      style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
