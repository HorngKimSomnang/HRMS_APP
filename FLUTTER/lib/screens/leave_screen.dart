import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/leave_service.dart';
import '../providers/leave_provider.dart';

class LeaveScreen extends StatefulWidget {
  const LeaveScreen({super.key});

  @override
  State<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends State<LeaveScreen> {
  final _formKey = GlobalKey<FormState>();
  final LeaveService _leaveService = LeaveService();
  
  List<dynamic> _leaveTypes = [];
  bool _loadingTypes = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadTypes();
  }

  Future<void> _loadTypes() async {
    try {
      final types = await _leaveService.fetchLeaveTypes();
      if (mounted) {
        setState(() {
          _leaveTypes = types;
          _loadingTypes = false;
        });
        
        // Auto-select first type if draft is empty and types exist
        final provider = Provider.of<LeaveProvider>(context, listen: false);
        if (provider.selectedType == null && types.isNotEmpty) {
           // We could auto select, but maybe better to let user choose
           // provider.setLeaveType(types.first);
        }
      }
    } catch (e) {
      if (mounted) setState(() => _loadingTypes = false);
    }
  }

  Future<void> _selectDate(bool isStart, LeaveProvider provider) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(primary: Color(0xFF2563EB)),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      if (isStart) {
        provider.setDates(picked, provider.endDate);
      } else {
        provider.setDates(provider.startDate, picked);
      }
    }
  }

  void _submit(LeaveProvider provider) async {
    if (!_formKey.currentState!.validate()) return;
    if (provider.startDate == null || provider.endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select dates')));
      return;
    }

    setState(() => _submitting = true);
    try {
      await _leaveService.submitLeaveRequest({
        'leave_type_id': provider.selectedType['id'],
        'start_date': DateFormat('yyyy-MM-dd').format(provider.startDate!),
        'end_date': DateFormat('yyyy-MM-dd').format(provider.endDate!),
        'reason': provider.reasonController.text,
      });
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Leave requested successfully!')));
      provider.clear(); // Clear draft on success
      
      // Optionally navigate to history or show success dialog
      
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showHistory(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _HistorySheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<LeaveProvider>(context);

    return Scaffold(
      backgroundColor: Colors.grey[50], // Light background
      appBar: AppBar(
        title: Text('New Request', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600)),
        centerTitle: true,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.history, color: Color(0xFF2563EB)),
            tooltip: 'History',
            onPressed: () => _showHistory(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Leave Type Dropdown
              Text("Leave Type", style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: _loadingTypes 
                  ? const Center(child: Padding(padding: EdgeInsets.all(12), child: SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))))
                  : DropdownButtonHideUnderline(
                  child: DropdownButtonFormField<int>(
                    value: provider.selectedType != null ? provider.selectedType['id'] as int : null,
                    decoration: const InputDecoration(border: InputBorder.none, icon: Icon(LucideIcons.list, size: 18, color: Color(0xFF2563EB))),
                    hint: Text('Select Type', style: GoogleFonts.notoSansKhmer(color: Colors.grey[400])),
                    items: _leaveTypes.map<DropdownMenuItem<int>>((type) {
                      return DropdownMenuItem<int>(
                        value: type['id'] as int, 
                        child: Text(type['name'].toString(), style: GoogleFonts.notoSansKhmer())
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        final selectedMap = _leaveTypes.firstWhere((t) => t['id'] == val);
                        provider.setLeaveType(selectedMap);
                      }
                    },
                    validator: (v) => v == null ? 'Required' : null,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // 2. Dates
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Start Date", style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500)),
                        const SizedBox(height: 8),
                        _DateSelector(
                          label: 'From',
                          date: provider.startDate, 
                          onTap: () => _selectDate(true, provider)
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("End Date", style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500)),
                        const SizedBox(height: 8),
                        _DateSelector(
                          label: 'To',
                          date: provider.endDate, 
                          onTap: () => _selectDate(false, provider)
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // 3. Reason
              Text("Reason", style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: TextFormField(
                  controller: provider.reasonController,
                  decoration: InputDecoration(
                    hintText: 'Enter reason for leave...',
                    hintStyle: GoogleFonts.notoSansKhmer(color: Colors.grey[400]),
                    contentPadding: const EdgeInsets.all(16),
                    border: InputBorder.none,
                  ),
                  maxLines: 4,
                  validator: (v) => v!.isEmpty ? 'Required' : null,
                ),
              ),
              
              const SizedBox(height: 40),

              // 4. Submit Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _submitting ? null : () => _submit(provider),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shadowColor: const Color(0xFF2563EB).withValues(alpha: 0.4),
                    elevation: 8,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _submitting 
                      ? const CircularProgressIndicator(color: Colors.white) 
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(LucideIcons.send, size: 20),
                            const SizedBox(width: 8),
                            Text('Submit Request', style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.w700)),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DateSelector extends StatelessWidget {
  final String label;
  final DateTime? date;
  final VoidCallback onTap;

  const _DateSelector({required this.label, required this.date, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
          border: Border.all(color: Colors.grey.shade100),
        ),
        child: Row(
          children: [
            const Icon(LucideIcons.calendar, size: 22, color: Color(0xFF2563EB)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                date == null ? 'Select Date' : DateFormat('dd MMM yyyy').format(date!),
                style: GoogleFonts.notoSansKhmer(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: date == null ? Colors.grey[400] : Colors.black87
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HistorySheet extends StatefulWidget {
  const _HistorySheet();

  @override
  State<_HistorySheet> createState() => _HistorySheetState();
}

class _HistorySheetState extends State<_HistorySheet> {
  final LeaveService _leaveService = LeaveService();
  List<dynamic> _leaves = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchLeaves();
  }

  Future<void> _fetchLeaves() async {
    try {
      final data = await _leaveService.fetchLeaves();
      if (mounted) setState(() { _leaves = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved': return Colors.green;
      case 'rejected': return Colors.red;
      default: return Colors.orange;
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('MMM dd, yyyy').format(date);
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.9,
      builder: (_, controller) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 16),
              Container(
                width: 40, height: 4,
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Text("Leave History", style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              Expanded(
                child: _loading 
                  ? const Center(child: CircularProgressIndicator())
                  : _leaves.isEmpty 
                    ? Center(child: Text("No history", style: GoogleFonts.notoSansKhmer(color: Colors.grey)))
                    : ListView.builder(
                        controller: controller,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: _leaves.length,
                        itemBuilder: (context, index) {
                          final leave = _leaves[index];
                          final color = _getStatusColor(leave['status']);
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: Colors.grey[50], // Slight background difference
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: ListTile(
                              leading: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                                child: Icon(LucideIcons.calendar, color: color, size: 20),
                              ),
                              title: Text(leave['leave_type']['name'], style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 14)),
                              subtitle: Text('${_formatDate(leave['start_date'])} - ${_formatDate(leave['end_date'])}', style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.grey[600])),
                              trailing: Text(leave['status'].toUpperCase(), style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold, fontSize: 11, color: color)),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
