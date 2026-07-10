import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';

class MyContractScreen extends StatefulWidget {
  const MyContractScreen({super.key});

  @override
  State<MyContractScreen> createState() => _MyContractScreenState();
}

class _MyContractScreenState extends State<MyContractScreen> {
  final ApiService _apiService = ApiService();
  Map<String, dynamic>? _current;
  List<dynamic> _history = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchContract();
  }

  Future<void> _fetchContract() async {
    try {
      final response = await _apiService.client.get('/my/contract');
      final data = response.data['data'];
      setState(() {
        _current = data['current'];
        _history = data['history'] ?? [];
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load contract';
      });
    }
  }

  String _fmt(String? date) {
    if (date == null) return '—';
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }

  int? _daysRemaining(String? endDate) {
    if (endDate == null) return null;
    try {
      final end = DateTime.parse(endDate);
      final today = DateTime.now();
      return end.difference(DateTime(today.year, today.month, today.day)).inDays;
    } catch (_) {
      return null;
    }
  }

  String _typeLabel(String? type) {
    switch (type) {
      case 'probation':
        return 'Probation';
      case 'fixed_term':
        return 'Fixed Term';
      case 'permanent':
        return 'Permanent';
      default:
        return type ?? '—';
    }
  }

  Color _typeColor(String? type) {
    switch (type) {
      case 'probation':
        return const Color(0xFFF59E0B);
      case 'fixed_term':
        return const Color(0xFF3B82F6);
      case 'permanent':
        return const Color(0xFF10B981);
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text('My Contract',
            style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Text(_error!,
                      style: GoogleFonts.notoSansKhmer(color: Colors.redAccent)))
              : RefreshIndicator(
                  onRefresh: _fetchContract,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_current == null)
                        _emptyCard()
                      else
                        _currentContractCard(_current!),
                      if (_history.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        Text('Previous Contracts',
                            style: GoogleFonts.notoSansKhmer(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: const Color(0xFF64748B))),
                        const SizedBox(height: 8),
                        ..._history.map((c) => _historyTile(c)),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _emptyCard() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          const Icon(LucideIcons.fileSignature, size: 40, color: Color(0xFFCBD5E1)),
          const SizedBox(height: 12),
          Text('No active contract on record.',
              style: GoogleFonts.notoSansKhmer(
                  fontSize: 13, color: const Color(0xFF64748B))),
          const SizedBox(height: 4),
          Text('Please contact HR for more information.',
              style: GoogleFonts.notoSansKhmer(
                  fontSize: 11, color: const Color(0xFF94A3B8))),
        ],
      ),
    );
  }

  Widget _currentContractCard(Map<String, dynamic> c) {
    final typeColor = _typeColor(c['type']);
    final days = _daysRemaining(c['end_date']);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: typeColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(LucideIcons.fileSignature, color: typeColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_typeLabel(c['type']),
                        style: GoogleFonts.notoSansKhmer(
                            fontWeight: FontWeight.bold, fontSize: 16)),
                    Text('Current Contract',
                        style: GoogleFonts.notoSansKhmer(
                            fontSize: 11, color: const Color(0xFF64748B))),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('ACTIVE',
                    style: GoogleFonts.notoSansKhmer(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF10B981))),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(child: _dateBox('Start Date', _fmt(c['start_date']))),
              const SizedBox(width: 12),
              Expanded(
                  child: _dateBox('End Date',
                      c['end_date'] == null ? 'Open-ended' : _fmt(c['end_date']))),
            ],
          ),
          if (days != null && days >= 0) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: (days <= 14 ? const Color(0xFFEF4444) : const Color(0xFFF59E0B))
                    .withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(LucideIcons.clock,
                      size: 16,
                      color: days <= 14
                          ? const Color(0xFFEF4444)
                          : const Color(0xFFF59E0B)),
                  const SizedBox(width: 8),
                  Text(
                    c['type'] == 'probation'
                        ? '$days days left in probation'
                        : '$days days until contract ends',
                    style: GoogleFonts.notoSansKhmer(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: days <= 14
                            ? const Color(0xFFEF4444)
                            : const Color(0xFFB45309)),
                  ),
                ],
              ),
            ),
          ],
          if (c['notes'] != null && '${c['notes']}'.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('Notes',
                style: GoogleFonts.notoSansKhmer(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF64748B))),
            const SizedBox(height: 4),
            Text('${c['notes']}',
                style: GoogleFonts.notoSansKhmer(
                    fontSize: 12, color: const Color(0xFF334155))),
          ],
        ],
      ),
    );
  }

  Widget _dateBox(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: GoogleFonts.notoSansKhmer(
                  fontSize: 10, color: const Color(0xFF94A3B8))),
          const SizedBox(height: 2),
          Text(value,
              style: GoogleFonts.notoSansKhmer(
                  fontSize: 13, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _historyTile(Map<String, dynamic> c) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Icon(LucideIcons.fileText, size: 18, color: _typeColor(c['type'])),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_typeLabel(c['type']),
                    style: GoogleFonts.notoSansKhmer(
                        fontWeight: FontWeight.w600, fontSize: 13)),
                Text('${_fmt(c['start_date'])} → ${_fmt(c['end_date'])}',
                    style: GoogleFonts.notoSansKhmer(
                        fontSize: 11, color: const Color(0xFF64748B))),
              ],
            ),
          ),
          Text('${c['status']}'.toUpperCase(),
              style: GoogleFonts.notoSansKhmer(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF94A3B8))),
        ],
      ),
    );
  }
}
