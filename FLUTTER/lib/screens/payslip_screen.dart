import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/payroll_service.dart';
import '../core/theme.dart';
import '../l10n/app_localizations.dart';
import '../services/live_refresh_mixin.dart';


class PayslipScreen extends StatefulWidget {
  const PayslipScreen({super.key});

  @override
  State<PayslipScreen> createState() => _PayslipScreenState();
}

class _PayslipScreenState extends State<PayslipScreen> with LiveRefreshMixin<PayslipScreen> {
  final PayrollService _payrollService = PayrollService();
  List<dynamic> _payslips = [];
  bool _isLoading = true;
  @override
  List<String> get watchedResources => ['payslips'];

  @override
  void onLiveRefresh(String resource) => _loadPayslips(forceRefresh: true);



  @override
  void initState() {
    super.initState();
    startLiveRefresh();
    _loadPayslips();
  }

  Future<void> _loadPayslips({bool forceRefresh = false}) async {
    try {
      final payslips = await _payrollService.getPayslips(forceRefresh: forceRefresh);
      if (mounted)
        setState(() {
          _payslips = payslips;
          _isLoading = false;
        });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showPayslipDetail(dynamic slip) {
    showDialog(
      context: context,
      builder: (_) => _PayslipDetailDialog(slip: slip),
    );
  }
  @override
  void dispose() {
    stopLiveRefresh();
    super.dispose();
  }


  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final months = [
      '',
      l10n.monthJan,
      l10n.monthFeb,
      l10n.monthMar,
      l10n.monthApr,
      l10n.monthMay,
      l10n.monthJun,
      l10n.monthJul,
      l10n.monthAug,
      l10n.monthSep,
      l10n.monthOct,
      l10n.monthNov,
      l10n.monthDec,
    ];
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: NestedScrollView(
        headerSliverBuilder: (context, _) => [
          SliverAppBar(
            expandedHeight: 130,
            floating: false,
            pinned: true,
            automaticallyImplyLeading: true,
            backgroundColor: const Color(0xFF10B981),
            foregroundColor: Colors.white,
            title: Text(
              l10n.myPayslips,
              style: GoogleFonts.notoSansKhmer(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF10B981), Color(0xFF059669)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 50, 20, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    LucideIcons.receipt,
                                    size: 12,
                                    color: Colors.white,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    l10n.totalPayslipsCount(_payslips.length),
                                    style: GoogleFonts.notoSansKhmer(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: () => _loadPayslips(forceRefresh: true),
                child: _payslips.isEmpty
                ? Stack(
                    children: [
                      ListView(physics: const AlwaysScrollableScrollPhysics()),
                      Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withValues(alpha: 0.08),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        LucideIcons.receipt,
                        size: 48,
                        color: const Color(0xFF10B981).withValues(alpha: 0.5),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      l10n.noPayslipsYet,
                      style: GoogleFonts.notoSansKhmer(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimaryLight,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      l10n.payslipsWillAppearHere,
                      style: GoogleFonts.notoSansKhmer(
                        fontSize: 13,
                        color: AppTheme.textSecondaryLight,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ])
            : ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
                itemCount: _payslips.length,
                itemBuilder: (context, index) {
                  final slip = _payslips[index];
                  final monthIdx =
                      int.tryParse(slip['month']?.toString() ?? '1') ?? 1;
                  final monthName = (monthIdx >= 1 && monthIdx <= 12)
                      ? months[monthIdx]
                      : '?';
                  return GestureDetector(
                    onTap: () => _showPayslipDetail(slip),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Colors.grey.shade100,
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 15,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: const Color(
                                          0xFF10B981,
                                        ).withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Icon(
                                        LucideIcons.fileText,
                                        color: Color(0xFF10B981),
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          l10n.payslipMonthYear(
                                            monthName,
                                            '${slip['year']}',
                                          ),
                                          style: GoogleFonts.notoSansKhmer(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                            color: AppTheme.textPrimaryLight,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          l10n.tapToViewDetails,
                                          style: GoogleFonts.notoSansKhmer(
                                            fontSize: 11,
                                            color: AppTheme.textSecondaryLight,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 5,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(
                                      0xFF10B981,
                                    ).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        LucideIcons.checkCircle,
                                        size: 12,
                                        color: Color(0xFF10B981),
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        l10n.issuedBadge,
                                        style: GoogleFonts.notoSansKhmer(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: const Color(0xFF10B981),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Row(
                              children: List.generate(
                                40,
                                (i) => Expanded(
                                  child: Container(
                                    color: i % 2 == 0
                                        ? Colors.transparent
                                        : Colors.grey.shade300,
                                    height: 1,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      l10n.grossSalary,
                                      style: GoogleFonts.notoSansKhmer(
                                        fontSize: 12,
                                        color: Colors.grey.shade500,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '\$${slip['basic_salary'] ?? '0.00'}',
                                      style: GoogleFonts.notoSansKhmer(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14,
                                        color: AppTheme.textPrimaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  width: 1,
                                  height: 30,
                                  color: Colors.grey.shade200,
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      l10n.netPay,
                                      style: GoogleFonts.notoSansKhmer(
                                        fontSize: 12,
                                        color: Colors.grey.shade500,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '\$${slip['net_salary'] ?? '0.00'}',
                                      style: GoogleFonts.notoSansKhmer(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: const Color(0xFF10B981),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
      ),
    );
  }
}

// ── Dialog Payslip Detail ───────────────────────────────────────────
class _PayslipDetailDialog extends StatefulWidget {
  final dynamic slip;
  const _PayslipDetailDialog({required this.slip});

  @override
  State<_PayslipDetailDialog> createState() => _PayslipDetailDialogState();
}

class _PayslipDetailDialogState extends State<_PayslipDetailDialog> {
  double _earn(String k) =>
      double.tryParse(widget.slip[k]?.toString() ?? '0') ?? 0;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final months = [
      '',
      l10n.monthJan,
      l10n.monthFeb,
      l10n.monthMar,
      l10n.monthApr,
      l10n.monthMay,
      l10n.monthJun,
      l10n.monthJul,
      l10n.monthAug,
      l10n.monthSep,
      l10n.monthOct,
      l10n.monthNov,
      l10n.monthDec,
    ];
    final monthIdx = int.tryParse(widget.slip['month']?.toString() ?? '1') ?? 1;
    final monthName = (monthIdx >= 1 && monthIdx <= 12)
        ? months[monthIdx]
        : '?';
    final totalEarnings =
        _earn('basic_salary') +
        _earn('overtime_amount') +
        _earn('commission') +
        _earn('attendance_bonus') +
        _earn('allowances');
    final totalDeductions =
        _earn('advance_deduction') +
        _earn('unpaid_leave_deduction') +
        _earn('deductions');

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: const BoxDecoration(
                color: Color(0xFF3B82F6),
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.monthYearPayslip(monthName, '${widget.slip['year']}'),
                    style: GoogleFonts.notoSansKhmer(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        LucideIcons.x,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header card
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(
                              0xFF3B82F6,
                            ).withValues(alpha: 0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              LucideIcons.building2,
                              size: 24,
                              color: Color(0xFF3B82F6),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'HEN CHEN',
                                style: GoogleFonts.notoSansKhmer(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  letterSpacing: 1,
                                ),
                              ),
                              Text(
                                l10n.salarySlipMonthYear(
                                  monthName,
                                  '${widget.slip['year']}',
                                ),
                                style: GoogleFonts.notoSansKhmer(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white70,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Earnings
                    _section(l10n.earningsSection, const Color(0xFF10B981), [
                      _row(
                        context,
                        l10n.basicSalary,
                        _earn('basic_salary'),
                        isEarning: true,
                      ),
                      if (_earn('overtime_amount') > 0)
                        _row(
                          context,
                          l10n.overtimeOT,
                          _earn('overtime_amount'),
                          isEarning: true,
                        ),
                      if (_earn('commission') > 0)
                        _row(
                          context,
                          l10n.commission,
                          _earn('commission'),
                          isEarning: true,
                        ),
                      if (_earn('attendance_bonus') > 0)
                        _row(
                          context,
                          l10n.attendanceBonus,
                          _earn('attendance_bonus'),
                          isEarning: true,
                        ),
                      if (_earn('allowances') > 0)
                        _row(
                          context,
                          l10n.allowances,
                          _earn('allowances'),
                          isEarning: true,
                        ),
                      _total(
                        l10n.totalEarnings,
                        totalEarnings,
                        color: const Color(0xFF10B981),
                      ),
                    ]),
                    const SizedBox(height: 12),

                    // Deductions
                    _section(l10n.deductionsSection, const Color(0xFFEF4444), [
                      if (_earn('tax') > 0)
                        _row(context, l10n.tax, _earn('tax'), isEarning: false),
                      if (_earn('advance_deduction') > 0)
                        _row(
                          context,
                          l10n.advanceDeduction,
                          _earn('advance_deduction'),
                          isEarning: false,
                        ),
                      if (_earn('unpaid_leave_deduction') > 0)
                        _row(
                          context,
                          l10n.unpaidLeave,
                          _earn('unpaid_leave_deduction'),
                          isEarning: false,
                        ),
                      if (_earn('deductions') > 0)
                        _row(
                          context,
                          l10n.otherDeductions,
                          _earn('deductions'),
                          isEarning: false,
                        ),

                      if (totalDeductions == 0 && _earn('tax') == 0)
                        _row(
                          context,
                          l10n.noneTaxExempt,
                          0.00,
                          isEarning: false,
                        ),

                      _total(
                        l10n.totalDeductions,
                        totalDeductions,
                        color: const Color(0xFFEF4444),
                        isNeg: true,
                      ),
                    ]),
                    const SizedBox(height: 16),

                    // Net Salary bar
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF10B981), Color(0xFF059669)],
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            l10n.netSalaryCaps,
                            style: GoogleFonts.notoSansKhmer(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            '\$${_earn('net_salary').toStringAsFixed(2)}',
                            style: GoogleFonts.notoSansKhmer(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _section(String title, Color color, List<Widget> children) =>
      Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: color.withValues(alpha: 0.25)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                title,
                style: GoogleFonts.notoSansKhmer(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            ...children,
          ],
        ),
      );

  Widget _row(
    BuildContext context,
    String label,
    double amount, {
    required bool isEarning,
  }) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.notoSansKhmer(
            fontSize: 13,
            color: Colors.grey.shade600,
          ),
        ),
        Text(
          '${isEarning ? "+" : "-"}\$${amount.toStringAsFixed(2)}',
          style: GoogleFonts.notoSansKhmer(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isEarning
                ? const Color(0xFF10B981)
                : const Color(0xFFEF4444),
          ),
        ),
      ],
    ),
  );

  Widget _total(
    String label,
    double amount, {
    required Color color,
    bool isNeg = false,
  }) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.06),
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
    ),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.notoSansKhmer(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        Text(
          '${isNeg ? "-" : "+"}\$${amount.toStringAsFixed(2)}',
          style: GoogleFonts.notoSansKhmer(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    ),
  );
}
