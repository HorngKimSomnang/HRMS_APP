import 'package:flutter/material.dart';

import '../core/error_utils.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:skeletonizer/skeletonizer.dart';
import '../l10n/app_localizations.dart';
import '../services/leave_service.dart';
import '../providers/leave_provider.dart';
import '../widgets/date_selector.dart';

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

  List<dynamic> _balances = [];
  bool _loadingBalances = true;

  @override
  void initState() {
    super.initState();
    _loadTypes();
    _loadBalances();
  }

  Future<void> _loadBalances() async {
    try {
      final balances = await _leaveService.fetchLeaveBalances();
      if (mounted) {
        setState(() {
          _balances = balances;
          _loadingBalances = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loadingBalances = false);
    }
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
    final picked = await showAppDatePicker(context, initialDate: DateTime.now(), firstDate: DateTime.now(), lastDate: DateTime(2030));
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
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.selectDates)));
      return;
    }
    if (provider.selectedType == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.pleaseSelectLeaveType)));
      return;
    }

    setState(() => _submitting = true);
    try {
      await _leaveService.submitLeaveRequest({
        'leave_type_id': provider.selectedType!['id'],
        'start_date': DateFormat('yyyy-MM-dd').format(provider.startDate!),
        'end_date': DateFormat('yyyy-MM-dd').format(provider.endDate!),
        'reason': provider.reasonController.text,
      });
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.leaveRequestedSuccessfully)));
      provider.clear(); // Clear draft on success
      
      // Optionally navigate to history or show success dialog
      
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(context, e))));
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
        title: Text(AppLocalizations.of(context)!.newRequest, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600)),
        centerTitle: true,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.history, color: Color(0xFF2563EB)),
            tooltip: AppLocalizations.of(context)!.history,
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
              // 0. Leave Balances
              if (_loadingBalances || _balances.isNotEmpty) ...[
                Text(AppLocalizations.of(context)!.yourLeaveBalance, style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                SizedBox(
                  height: 92,
                  child: Skeletonizer(
                    enabled: _loadingBalances,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _loadingBalances ? 3 : _balances.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, index) {
                        final balance = _loadingBalances
                            ? {'leave_type': 'Loading...', 'days_allowed': 0, 'days_used': 0, 'days_remaining': 0}
                            : _balances[index];
                        final allowed = (balance['days_allowed'] as num).toInt();
                        final remaining = (balance['days_remaining'] as num).toInt();
                        final isLimit = allowed > 0 && remaining == 0;
                        final progress = allowed > 0 ? ((allowed - remaining) / allowed).clamp(0.0, 1.0) : 0.0;
                        return Container(
                          width: 160,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
                            border: Border.all(color: isLimit ? Colors.red.shade100 : Colors.orange.shade100),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      balance['leave_type'].toString(),
                                      style: GoogleFonts.notoSansKhmer(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey[600], letterSpacing: 0.3),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  if (isLimit)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(4)),
                                      child: Text(AppLocalizations.of(context)!.limitBadge, style: GoogleFonts.notoSansKhmer(fontSize: 8, fontWeight: FontWeight.w700, color: Colors.red)),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Text('$remaining', style: GoogleFonts.notoSansKhmer(fontSize: 20, fontWeight: FontWeight.bold)),
                                  const SizedBox(width: 4),
                                  Text('/ $allowed ${AppLocalizations.of(context)!.daysUnit}', style: GoogleFonts.notoSansKhmer(fontSize: 11, color: Colors.grey[500])),
                                ],
                              ),
                              const SizedBox(height: 8),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: progress,
                                  minHeight: 5,
                                  backgroundColor: Colors.grey.shade100,
                                  valueColor: AlwaysStoppedAnimation<Color>(isLimit ? Colors.red : const Color(0xFF2563EB)),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // 1. Leave Type Dropdown
              Text(AppLocalizations.of(context)!.leaveType, style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: Skeletonizer(
                  enabled: _loadingTypes,
                  child: DropdownButtonHideUnderline(
                  child: DropdownButtonFormField<int>(
                    value: provider.selectedType != null ? provider.selectedType['id'] as int : null,
                    decoration: const InputDecoration(border: InputBorder.none, icon: Icon(LucideIcons.list, size: 18, color: Color(0xFF2563EB))),
                    hint: Text(AppLocalizations.of(context)!.selectType, style: GoogleFonts.notoSansKhmer(color: Colors.grey[400])),
                    items: (_loadingTypes ? [{'id': 1, 'name': 'Loading...'}] : _leaveTypes).map<DropdownMenuItem<int>>((type) {
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
                    validator: (v) => v == null ? AppLocalizations.of(context)!.required : null,
                  ),
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
                        Text(AppLocalizations.of(context)!.startDate, style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500)),
                        const SizedBox(height: 8),
                        DateSelector(
                          date: provider.startDate,
                          onTap: () => _selectDate(true, provider),
                          placeholder: AppLocalizations.of(context)!.selectDate,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(AppLocalizations.of(context)!.endDate, style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500)),
                        const SizedBox(height: 8),
                        DateSelector(
                          date: provider.endDate,
                          onTap: () => _selectDate(false, provider),
                          placeholder: AppLocalizations.of(context)!.selectDate,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // 3. Reason
              Text(AppLocalizations.of(context)!.reason, style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500)),
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
                    hintText: AppLocalizations.of(context)!.enterReasonForLeave,
                    hintStyle: GoogleFonts.notoSansKhmer(color: Colors.grey[400]),
                    contentPadding: const EdgeInsets.all(16),
                    border: InputBorder.none,
                  ),
                  maxLines: 4,
                  validator: (v) => v!.isEmpty ? AppLocalizations.of(context)!.required : null,
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
                            Text(AppLocalizations.of(context)!.submitRequest, style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.w700)),
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
                child: Text(AppLocalizations.of(context)!.leaveHistory, style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              Expanded(
                child: Skeletonizer(
                  enabled: _loading,
                  child: (_leaves.isEmpty && !_loading)
                    ? Center(child: Text(AppLocalizations.of(context)!.noHistory, style: GoogleFonts.notoSansKhmer(color: Colors.grey)))
                    : ListView.builder(
                        controller: controller,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: _loading ? 3 : _leaves.length,
                        itemBuilder: (context, index) {
                          final leave = _loading ? {
                            'leave_type': {'name': 'Loading...'},
                            'start_date': '2023-01-01',
                            'end_date': '2023-01-02',
                            'status': 'pending'
                          } : _leaves[index];
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
              ),
            ],
          ),
        );
      },
    );
  }
}
