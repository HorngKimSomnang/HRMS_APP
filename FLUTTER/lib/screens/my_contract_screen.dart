import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';
import '../l10n/app_localizations.dart';
import '../services/live_refresh_mixin.dart';


class MyContractScreen extends StatefulWidget {
  const MyContractScreen({super.key});

  @override
  State<MyContractScreen> createState() => _MyContractScreenState();
}

class _MyContractScreenState extends State<MyContractScreen> with LiveRefreshMixin<MyContractScreen> {
  final ApiService _apiService = ApiService();
  Map<String, dynamic>? _current;
  List<dynamic> _history = [];
  bool _loading = true;
  String? _error;
  @override
  List<String> get watchedResources => ['lifecycle'];

  @override
  void onLiveRefresh(String resource) => _fetchContract();



  @override
  void initState() {
    super.initState();
    startLiveRefresh();
    _fetchContract();
  }

  Future<void> _fetchContract() async {
    try {
      final response = await ApiService.instance.cachedGet('/my/contract');
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
        _error = AppLocalizations.of(context)!.failedToLoadContract;
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
        return AppLocalizations.of(context)!.contractProbation;
      case 'fixed_term':
        return AppLocalizations.of(context)!.contractFixedTerm;
      case 'permanent':
        return AppLocalizations.of(context)!.contractPermanent;
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
  void dispose() {
    stopLiveRefresh();
    super.dispose();
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.myContract,
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
                        Text(AppLocalizations.of(context)!.previousContracts,
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
          Text(AppLocalizations.of(context)!.noActiveContract,
              style: GoogleFonts.notoSansKhmer(
                  fontSize: 13, color: const Color(0xFF64748B))),
          const SizedBox(height: 4),
          Text(AppLocalizations.of(context)!.contactHrForInfo,
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
                    Text(AppLocalizations.of(context)!.currentContractLabel,
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
                child: Text(AppLocalizations.of(context)!.activeBadge,
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
              Expanded(child: _dateBox(AppLocalizations.of(context)!.startDate, _fmt(c['start_date']))),
              const SizedBox(width: 12),
              Expanded(
                  child: _dateBox(AppLocalizations.of(context)!.endDate,
                      c['end_date'] == null ? AppLocalizations.of(context)!.openEnded : _fmt(c['end_date']))),
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
                        ? AppLocalizations.of(context)!.daysLeftInProbation(days)
                        : AppLocalizations.of(context)!.daysUntilContractEnds(days),
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
            Text(AppLocalizations.of(context)!.notes,
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
