import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/payroll_service.dart';
import '../core/theme.dart';

class PayrollScreen extends StatefulWidget {
  final int initialTabIndex;
  const PayrollScreen({super.key, this.initialTabIndex = 0});

  @override
  State<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends State<PayrollScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final PayrollService _payrollService = PayrollService();

  List<dynamic> _requests = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 1, vsync: this, initialIndex: 0);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final requests = await _payrollService.getPayrollRequests();
      if (mounted) {
        setState(() {
          _requests = requests;
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

  // ── Submit or Edit Payment Request ────────────────────────────────────────────
  void _showRequestDialog([Map<String, dynamic>? existingReq]) {
    final isEditing = existingReq != null;
    final reqId = isEditing ? existingReq['id'] : null;

    final bankAccountCtrl = TextEditingController(text: isEditing ? existingReq['bank_account']?.toString() : '');
    final bankNameCtrl    = TextEditingController(text: isEditing ? existingReq['bank_name']?.toString() : '');
    final noteCtrl        = TextEditingController(text: isEditing ? existingReq['reason']?.toString() : '');
    final valueCtrl       = TextEditingController(text: isEditing ? existingReq['value']?.toString() : '');
    String selectedType   = isEditing ? (existingReq['type']?.toString() ?? 'advance_payment') : 'advance_payment';

    final banks = ['ABA Bank', 'ACLEDA Bank', 'Wing Bank', 'Canadia Bank', 'Other'];
    final types = [
      {'label': 'Advance Payment', 'value': 'advance_payment'},
      {'label': 'Bonus', 'value': 'bonus'},
      {'label': 'Expense Claim', 'value': 'expense_claim'}
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => DraggableScrollableSheet(
          initialChildSize: 0.75,
          maxChildSize: 0.95,
          builder: (_, controller) => Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              children: [
                const SizedBox(height: 12),
                Container(width: 40, height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
                const SizedBox(height: 20),

                // Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                        child: Icon(isEditing ? LucideIcons.edit : LucideIcons.wallet, color: AppTheme.primary, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(isEditing ? 'Edit Request' : 'Payment Request', style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryLight)),
                        Text(isEditing ? 'Update your bank details or amount' : 'Submit your bank details to receive payment', style: GoogleFonts.notoSansKhmer(fontSize: 11, color: AppTheme.textSecondaryLight)),
                      ]),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                Expanded(
                  child: ListView(
                    controller: controller,
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    children: [
                      // Request Type
                      _label('Request Type'),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        value: selectedType,
                        style: GoogleFonts.notoSansKhmer(fontSize: 14, color: AppTheme.textPrimaryLight),
                        decoration: _inputDeco(icon: LucideIcons.fileText),
                        items: types.map((t) => DropdownMenuItem(value: t['value'], child: Text(t['label']!))).toList(),
                        onChanged: (v) { if (v != null) setSheet(() => selectedType = v); },
                      ),
                      const SizedBox(height: 20),

                      // Value / Amount / Hours
                      _label('Amount / Hours (Optional)'),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: valueCtrl,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        style: GoogleFonts.notoSansKhmer(fontSize: 14, color: AppTheme.textPrimaryLight),
                        decoration: _inputDeco(icon: LucideIcons.dollarSign, hint: 'e.g. 50.00'),
                      ),
                      const SizedBox(height: 20),

                      // Bank Name
                      _label('Bank Name (Optional)'),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        hint: Text('Select your bank', style: GoogleFonts.notoSansKhmer(color: Colors.grey.shade400, fontSize: 14)),
                        style: GoogleFonts.notoSansKhmer(fontSize: 14, color: AppTheme.textPrimaryLight),
                        decoration: _inputDeco(icon: LucideIcons.building2),
                        items: banks.map((b) => DropdownMenuItem(value: b, child: Text(b))).toList(),
                        onChanged: (v) { if (v != null) bankNameCtrl.text = v; },
                      ),
                      const SizedBox(height: 20),

                      // Bank Account
                      _label('Account Number (Optional)'),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: bankAccountCtrl,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(10),
                        ],
                        style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: 4, color: AppTheme.textPrimaryLight),
                        decoration: _inputDeco(
                          icon: LucideIcons.creditCard,
                          hint: '••••••',
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text('Enter your bank account number (digits only)', 
                        style: GoogleFonts.notoSansKhmer(fontSize: 11, color: Colors.grey.shade500)),
                      const SizedBox(height: 20),

                      // Note
                      _label('Note (optional)'),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: noteCtrl,
                        maxLines: 3,
                        style: GoogleFonts.notoSansKhmer(fontSize: 14, color: AppTheme.textPrimaryLight),
                        decoration: _inputDeco(icon: LucideIcons.alignLeft, hint: 'e.g. March salary, Overtime pay...'),
                      ),
                      const SizedBox(height: 32),

                      Row(
                        children: [
                          if (isEditing) ...[
                            Expanded(
                              flex: 1,
                              child: SizedBox(
                                height: 52,
                                child: OutlinedButton(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.red,
                                    side: const BorderSide(color: Colors.red),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  ),
                                  onPressed: () async {
                                    Navigator.pop(ctx);
                                    _confirmDelete(reqId);
                                  },
                                  child: const Icon(LucideIcons.trash2),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                          ],
                          Expanded(
                            flex: 3,
                            child: SizedBox(
                              height: 52,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primary,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  elevation: 0,
                                ),
                                onPressed: () async {
                                  Navigator.pop(ctx);
                                  setState(() => _isLoading = true);
                                  try {
                                    final data = {
                                      'type': selectedType,
                                      'date': DateFormat('yyyy-MM-dd').format(DateTime.now()),
                                      'value': double.tryParse(valueCtrl.text) ?? 0.0,
                                      'reason': noteCtrl.text.isEmpty ? 'Payment request' : noteCtrl.text,
                                      'bank_account': bankAccountCtrl.text,
                                      'bank_name': bankNameCtrl.text,
                                    };
                                    if (isEditing) {
                                      await _payrollService.updatePayrollRequest(reqId, data);
                                    } else {
                                      await _payrollService.submitPayrollRequest(data);
                                    }
                                    _loadData();
                                  } catch (e) {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                                      setState(() => _isLoading = false);
                                    }
                                  }
                                },
                                child: Text(isEditing ? 'Save Changes' : 'Submit Request', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 15)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmDelete(int id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete Request', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold)),
        content: Text('Are you sure you want to delete this payment request?', style: GoogleFonts.notoSansKhmer()),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _isLoading = true);
              try {
                await _payrollService.deletePayrollRequest(id);
                _loadData();
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                  setState(() => _isLoading = false);
                }
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _label(String text) => Text(text,
    style: GoogleFonts.notoSansKhmer(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondaryLight));

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

  // ── Empty State ───────────────────────────────────────────────────────
  Widget _emptyState(IconData icon, String title, String sub) => Center(
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.08), shape: BoxShape.circle),
        child: Icon(icon, size: 48, color: AppTheme.primary.withValues(alpha: 0.5)),
      ),
      const SizedBox(height: 20),
      Text(title, style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimaryLight)),
      const SizedBox(height: 6),
      Text(sub, style: GoogleFonts.notoSansKhmer(fontSize: 13, color: AppTheme.textSecondaryLight), textAlign: TextAlign.center),
    ]),
  );

  // ── Requests List ─────────────────────────────────────────────────────
  Widget _buildRequestsList() {
    if (_requests.isEmpty) return _emptyState(LucideIcons.wallet, 'No Requests Yet', 'Tap the button below to\nrequest a payment.');

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      itemCount: _requests.length,
      itemBuilder: (context, index) {
        final req = _requests[index];
        final bankAccount = req['bank_account']?.toString() ?? '';
        final bankName    = req['bank_name']?.toString() ?? '';
        final note        = req['reason']?.toString() ?? '';
        String date       = req['date']?.toString() ?? '';
        if (date.isNotEmpty) {
          try {
            date = DateFormat('MMM dd, yyyy').format(DateTime.parse(date));
          } catch (_) {}
        }
        final typeRaw = req['type']?.toString() ?? 'advance_payment';
        final typeLabel = typeRaw.split('_').map((w) => w[0].toUpperCase() + w.substring(1)).join(' ');
        final title = bankName.isEmpty ? typeLabel : '$typeLabel - $bankName';

        Color statusColor; IconData statusIcon; String statusLabel = (req['status'] ?? 'pending').toString().toUpperCase();
        switch (req['status']) {
          case 'approved': statusColor = const Color(0xFF10B981); statusIcon = LucideIcons.checkCircle; break;
          case 'rejected': statusColor = const Color(0xFFEF4444); statusIcon = LucideIcons.xCircle; break;
          default:         statusColor = const Color(0xFFF59E0B); statusIcon = LucideIcons.clock;
        }

        // Mask account: show last 4 digits only
        final maskedAccount = bankAccount.length > 4
            ? '${'•' * (bankAccount.length - 4)}${bankAccount.substring(bankAccount.length - 4)}'
            : bankAccount;

        return GestureDetector(
          onTap: () {
            if (req['status'] == 'pending') {
              _showRequestDialog(req);
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('You can only edit pending requests.')),
              );
            }
          },
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 2))],
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: Icon(LucideIcons.creditCard, color: AppTheme.primary, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(title,
                          style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.textPrimaryLight)),
                        Text(date, style: GoogleFonts.notoSansKhmer(fontSize: 11, color: AppTheme.textSecondaryLight)),
                      ]),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(statusIcon, size: 11, color: statusColor),
                        const SizedBox(width: 4),
                        Text(statusLabel, style: GoogleFonts.notoSansKhmer(fontSize: 10, fontWeight: FontWeight.w700, color: statusColor)),
                      ]),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 12),
                if (maskedAccount.isNotEmpty) ...[
                  // Bank Account (masked)
                  Row(children: [
                    Icon(LucideIcons.lock, size: 13, color: Colors.grey.shade400),
                    const SizedBox(width: 6),
                    Text('Account: ', style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.grey.shade500)),
                    Text(maskedAccount, style: GoogleFonts.notoSansKhmer(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 2, color: AppTheme.textPrimaryLight)),
                  ]),
                ],
                if (req['value'] != null && double.tryParse(req['value'].toString()) != null && double.parse(req['value'].toString()) > 0) ...[
                  if (maskedAccount.isNotEmpty) const SizedBox(height: 4),
                  Row(children: [
                    Icon(LucideIcons.dollarSign, size: 13, color: Colors.grey.shade400),
                    const SizedBox(width: 6),
                    Text('Value/Amount: ', style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.grey.shade500)),
                    Text(req['value'].toString(), style: GoogleFonts.notoSansKhmer(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primary)),
                  ]),
                ],
                if (note.isNotEmpty && note != 'Payment request') ...[
                  const SizedBox(height: 4),
                  Row(children: [
                    Icon(LucideIcons.messageSquare, size: 13, color: Colors.grey.shade400),
                    const SizedBox(width: 6),
                    Expanded(child: Text(note, style: GoogleFonts.notoSansKhmer(fontSize: 12, color: AppTheme.textSecondaryLight), overflow: TextOverflow.ellipsis)),
                  ]),
                ],
              ]),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final pending  = _requests.where((r) => r['status'] == 'pending').length;
    final approved = _requests.where((r) => r['status'] == 'approved').length;

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: NestedScrollView(
        headerSliverBuilder: (context, _) => [
          SliverAppBar(
            expandedHeight: 140,
            floating: false,
            pinned: true,
            automaticallyImplyLeading: true,
            backgroundColor: const Color(0xFF3B82F6),
            foregroundColor: Colors.white,
            title: Text('Payroll & Payment', style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold)),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF6366F1)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 50, 20, 8),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.end, children: [
                      Row(children: [
                        _chip(LucideIcons.clock, '$pending Pending'),
                        const SizedBox(width: 10),
                        _chip(LucideIcons.checkCircle, '$approved Approved'),
                      ]),
                      const SizedBox(height: 12),
                    ]),
                  ),
                ),
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: Container(
                color: Colors.white,
                child: TabBar(
                  controller: _tabController,
                  indicatorColor: AppTheme.primary,
                  indicatorWeight: 3,
                  labelColor: AppTheme.primary,
                  unselectedLabelColor: AppTheme.textSecondaryLight,
                  labelStyle: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 14),
                  unselectedLabelStyle: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w500, fontSize: 14),
                  tabs: [
                    Tab(text: 'Requests (${_requests.length})'),
                  ],
                ),
              ),
            ),
          ),
        ],
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _buildRequestsList(),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showRequestDialog,
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        elevation: 4,
        icon: const Icon(LucideIcons.plus),
        label: Text('Request Payment', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _chip(IconData icon, String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 12, color: Colors.white),
      const SizedBox(width: 5),
      Text(label, style: GoogleFonts.notoSansKhmer(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white)),
    ]),
  );
}
