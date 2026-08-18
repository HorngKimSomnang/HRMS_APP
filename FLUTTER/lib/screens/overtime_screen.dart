import 'package:flutter/material.dart';

import '../core/error_utils.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../services/overtime_service.dart';
import '../services/api_service.dart';
import '../core/theme.dart';
import '../l10n/app_localizations.dart';
import '../services/live_refresh_mixin.dart';


class OvertimeScreen extends StatefulWidget {
  const OvertimeScreen({super.key});

  @override
  State<OvertimeScreen> createState() => _OvertimeScreenState();
}

class _OvertimeScreenState extends State<OvertimeScreen> with LiveRefreshMixin<OvertimeScreen> {
  final OvertimeService _overtimeService = OvertimeService();
  List<dynamic> _overtimes = [];
  bool _isLoading = true;
  bool _isContractPending = false;
  @override
  List<String> get watchedResources => ['overtimes'];

  @override
  void onLiveRefresh(String resource) => _loadOvertimes();



  @override
  void initState() {
    super.initState();
    startLiveRefresh();
    _loadOvertimes();
  }

  Future<void> _loadOvertimes() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.instance.cachedGet('/user');
      final user = res.data['user'];
      final contractsList = user?['employee']?['contracts'] as List? ?? [];
      final hasActiveContract = contractsList.any((c) => c['status'] == 'active');
      final hasPendingContract = contractsList.any((c) => c['status'] == 'pending');

      final overtimes = await _overtimeService.getOvertimes();
      if (mounted) {
        setState(() {
          _isContractPending = !hasActiveContract && hasPendingContract;
          _overtimes = overtimes;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(context, e))));
        setState(() => _isLoading = false);
      }
    }
  }

  void _showRequestDialog() {
    final dateCtrl = TextEditingController(text: DateFormat('yyyy-MM-dd').format(DateTime.now()));
    final startCtrl = TextEditingController();
    final endCtrl = TextEditingController();
    final hoursCtrl = TextEditingController();
    final reasonCtrl = TextEditingController();

    void calculateHours() {
      if (startCtrl.text.isNotEmpty && endCtrl.text.isNotEmpty) {
        try {
          final startParts = startCtrl.text.split(':');
          final endParts = endCtrl.text.split(':');
          if (startParts.length < 2 || endParts.length < 2) return;
          final startHour = int.parse(startParts[0]);
          final startMin = int.parse(startParts[1]);
          final endHour = int.parse(endParts[0]);
          final endMin = int.parse(endParts[1]);

          double diff = (endHour + endMin / 60.0) - (startHour + startMin / 60.0);
          if (diff < 0) diff += 24.0;

          String formatted = diff.toStringAsFixed(1);
          if (formatted.endsWith('.0')) {
            formatted = formatted.substring(0, formatted.length - 2);
          }
          hoursCtrl.text = formatted;
        } catch (_) {
          hoursCtrl.text = '';
        }
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        maxChildSize: 0.95,
        builder: (_, controller) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: ListView(
            controller: controller,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                    child: Icon(LucideIcons.clock, color: AppTheme.primary, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(AppLocalizations.of(context)!.requestOvertime, style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
                    Text(AppLocalizations.of(context)!.submitOvertimeRequestDesc, style: GoogleFonts.notoSansKhmer(fontSize: 11, color: Colors.grey[600])),
                  ]),
                ],
              ),
              const SizedBox(height: 24),

              // Date
              _label(AppLocalizations.of(context)!.date),
              const SizedBox(height: 8),
              TextField(
                controller: dateCtrl,
                readOnly: true,
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime.now().subtract(const Duration(days: 30)),
                    lastDate: DateTime.now().add(const Duration(days: 30)),
                  );
                  if (picked != null) {
                    dateCtrl.text = DateFormat('yyyy-MM-dd').format(picked);
                  }
                },
                decoration: _inputDeco(icon: LucideIcons.calendar),
              ),
              const SizedBox(height: 20),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _label(AppLocalizations.of(context)!.startTimeOptional),
                        const SizedBox(height: 8),
                        TextField(
                          controller: startCtrl,
                          readOnly: true,
                          onTap: () async {
                            final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
                            if (time != null) {
                              startCtrl.text = '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
                              calculateHours();
                            }
                          },
                          decoration: _inputDeco(icon: LucideIcons.clock3),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _label(AppLocalizations.of(context)!.endTimeOptional),
                        const SizedBox(height: 8),
                        TextField(
                          controller: endCtrl,
                          readOnly: true,
                          onTap: () async {
                            final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
                            if (time != null) {
                              endCtrl.text = '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
                              calculateHours();
                            }
                          },
                          decoration: _inputDeco(icon: LucideIcons.clock8),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Hours
              _label(AppLocalizations.of(context)!.totalHours),
              const SizedBox(height: 8),
              TextField(
                controller: hoursCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: _inputDeco(icon: LucideIcons.hourglass, hint: AppLocalizations.of(context)!.hoursHintExample),
              ),
              const SizedBox(height: 20),

              // Reason
              _label(AppLocalizations.of(context)!.reason),
              const SizedBox(height: 8),
              TextField(
                controller: reasonCtrl,
                maxLines: 3,
                decoration: _inputDeco(icon: LucideIcons.messageSquare, hint: AppLocalizations.of(context)!.overtimeReasonHint),
              ),
              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () async {
                    if (dateCtrl.text.isEmpty || hoursCtrl.text.isEmpty || reasonCtrl.text.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.pleaseFillRequiredFields)));
                      return;
                    }
                    Navigator.pop(ctx);
                    setState(() => _isLoading = true);
                    try {
                      await _overtimeService.requestOvertime({
                        'date': dateCtrl.text,
                        if (startCtrl.text.isNotEmpty) 'start_time': startCtrl.text,
                        if (endCtrl.text.isNotEmpty) 'end_time': endCtrl.text,
                        'hours': double.tryParse(hoursCtrl.text) ?? 0,
                        'reason': reasonCtrl.text,
                      });
                      _loadOvertimes();
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(context, e))));
                        setState(() => _isLoading = false);
                      }
                    }
                  },
                  child: Text(AppLocalizations.of(context)!.submitRequest, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(text, style: GoogleFonts.notoSansKhmer(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondaryLight));

  InputDecoration _inputDeco({required IconData icon, String hint = ''}) => InputDecoration(
    hintText: hint,
    hintStyle: GoogleFonts.notoSansKhmer(color: Colors.grey.shade400),
    prefixIcon: Icon(icon, size: 18, color: AppTheme.textSecondaryLight),
    filled: true,
    fillColor: Colors.grey.shade50,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary, width: 1.5)),
  );
  @override
  void dispose() {
    stopLiveRefresh();
    super.dispose();
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.overtimeRequests, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.black87)),
        backgroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.black87),
        elevation: 0,
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _isContractPending
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(LucideIcons.fileClock, size: 64, color: Colors.orange),
                        const SizedBox(height: 16),
                        Text(
                          'Your contract is pending activation by HR. You cannot request overtime at this time.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.notoSansKhmer(fontSize: 16, color: Colors.orange[800], fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                )
              : _overtimes.isEmpty
                  ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.clock, size: 64, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text(AppLocalizations.of(context)!.noOvertimeRequests, style: GoogleFonts.notoSansKhmer(fontSize: 16, color: Colors.grey.shade500)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _overtimes.length,
                  itemBuilder: (context, index) {
                    final item = _overtimes[index];
                    Color statusColor; IconData statusIcon;
                    switch (item['status']) {
                      case 'approved': statusColor = const Color(0xFF10B981); statusIcon = LucideIcons.checkCircle; break;
                      case 'rejected': statusColor = const Color(0xFFEF4444); statusIcon = LucideIcons.xCircle; break;
                      default:         statusColor = const Color(0xFFF59E0B); statusIcon = LucideIcons.clock;
                    }

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 2))],
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(DateFormat('MMM dd, yyyy').format(DateTime.parse(item['date'].toString())), style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.black87)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(statusIcon, size: 12, color: statusColor),
                                    const SizedBox(width: 4),
                                    Text(item['status'].toString().toUpperCase(), style: GoogleFonts.notoSansKhmer(fontSize: 12, fontWeight: FontWeight.bold, color: statusColor)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Icon(LucideIcons.hourglass, size: 14, color: Colors.grey[600]),
                              const SizedBox(width: 6),
                              Text(AppLocalizations.of(context)!.hoursValue(item['hours'].toString()), style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.black87, fontWeight: FontWeight.bold)),
                              if (item['start_time'] != null && item['end_time'] != null) ...[
                                const SizedBox(width: 12),
                                Text('(${item['start_time']} - ${item['end_time']})', style: GoogleFonts.notoSansKhmer(fontSize: 13, color: Colors.grey[600])),
                              ]
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(item['reason'] ?? '', style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600])),
                        ],
                      ),
                    );
                  },
                ),
      floatingActionButton: _isContractPending ? null : FloatingActionButton.extended(
        onPressed: _showRequestDialog,
        backgroundColor: AppTheme.primary,
        icon: const Icon(LucideIcons.plus, color: Colors.white),
        label: Text(AppLocalizations.of(context)!.requestOvertime, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, color: Colors.white)),
      ),
    );
  }
}
