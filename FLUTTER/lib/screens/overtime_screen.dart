import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../services/overtime_service.dart';
import '../core/theme.dart';

class OvertimeScreen extends StatefulWidget {
  const OvertimeScreen({super.key});

  @override
  State<OvertimeScreen> createState() => _OvertimeScreenState();
}

class _OvertimeScreenState extends State<OvertimeScreen> {
  final OvertimeService _overtimeService = OvertimeService();
  List<dynamic> _overtimes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadOvertimes();
  }

  Future<void> _loadOvertimes() async {
    setState(() => _isLoading = true);
    try {
      final overtimes = await _overtimeService.getOvertimes();
      if (mounted) {
        setState(() {
          _overtimes = overtimes;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
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
                    Text('Request Overtime', style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryLight)),
                    Text('Submit a request to work extra hours', style: GoogleFonts.notoSansKhmer(fontSize: 11, color: AppTheme.textSecondaryLight)),
                  ]),
                ],
              ),
              const SizedBox(height: 24),

              // Date
              _label('Date'),
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
                        _label('Start Time (Optional)'),
                        const SizedBox(height: 8),
                        TextField(
                          controller: startCtrl,
                          readOnly: true,
                          onTap: () async {
                            final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
                            if (time != null) {
                              startCtrl.text = '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
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
                        _label('End Time (Optional)'),
                        const SizedBox(height: 8),
                        TextField(
                          controller: endCtrl,
                          readOnly: true,
                          onTap: () async {
                            final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
                            if (time != null) {
                              endCtrl.text = '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
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
              _label('Total Hours'),
              const SizedBox(height: 8),
              TextField(
                controller: hoursCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: _inputDeco(icon: LucideIcons.hourglass, hint: 'e.g. 2.5'),
              ),
              const SizedBox(height: 20),

              // Reason
              _label('Reason'),
              const SizedBox(height: 8),
              TextField(
                controller: reasonCtrl,
                maxLines: 3,
                decoration: _inputDeco(icon: LucideIcons.messageSquare, hint: 'e.g. Server maintenance, Project deadline...'),
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
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill required fields')));
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
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                        setState(() => _isLoading = false);
                      }
                    }
                  },
                  child: Text('Submit Request', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 15)),
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
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text('Overtime Requests', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimaryLight,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _overtimes.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.clock, size: 64, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text('No overtime requests yet', style: GoogleFonts.notoSansKhmer(fontSize: 16, color: Colors.grey.shade500)),
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
                              Text(DateFormat('MMM dd, yyyy').format(DateTime.parse(item['date'].toString())), style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold, fontSize: 15)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(statusIcon, size: 12, color: statusColor),
                                    const SizedBox(width: 4),
                                    Text(item['status'].toString().toUpperCase(), style: GoogleFonts.notoSansKhmer(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Icon(LucideIcons.hourglass, size: 14, color: AppTheme.textSecondaryLight),
                              const SizedBox(width: 6),
                              Text('${item['hours']} Hours', style: GoogleFonts.notoSansKhmer(fontSize: 13, color: AppTheme.textPrimaryLight, fontWeight: FontWeight.w600)),
                              if (item['start_time'] != null && item['end_time'] != null) ...[
                                const SizedBox(width: 12),
                                Text('(${item['start_time']} - ${item['end_time']})', style: GoogleFonts.notoSansKhmer(fontSize: 12, color: AppTheme.textSecondaryLight)),
                              ]
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(item['reason'] ?? '', style: GoogleFonts.notoSansKhmer(fontSize: 13, color: AppTheme.textSecondaryLight)),
                        ],
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showRequestDialog,
        backgroundColor: AppTheme.primary,
        icon: const Icon(LucideIcons.plus, color: Colors.white),
        label: Text('Request Overtime', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, color: Colors.white)),
      ),
    );
  }
}
