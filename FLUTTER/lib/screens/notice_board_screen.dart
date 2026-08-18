import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../core/error_utils.dart';
import '../l10n/app_localizations.dart';
import '../services/api_service.dart';
import '../services/live_refresh_mixin.dart';


class NoticeBoardScreen extends StatefulWidget {
  const NoticeBoardScreen({super.key, this.noticeId});

  final int? noticeId;

  @override
  State<NoticeBoardScreen> createState() => _NoticeBoardScreenState();
}

class _NoticeBoardScreenState extends State<NoticeBoardScreen> with LiveRefreshMixin<NoticeBoardScreen> {
  final ApiService _apiService = ApiService();
  List<Map<String, dynamic>> _notices = [];
  bool _loading = true;
  bool _openedRequestedNotice = false;
  @override
  List<String> get watchedResources => ['announcements'];

  @override
  void onLiveRefresh(String resource) => _fetchNotices();



  @override
  void initState() {
    super.initState();
    startLiveRefresh();
    _fetchNotices();
  }

  Future<void> _fetchNotices() async {
    try {
      final response = await ApiService.instance.cachedGet('/announcements');
      final responseData = response.data;
      final rawData = responseData is Map ? responseData['data'] : responseData;
      final notices = rawData is List
          ? rawData
                .whereType<Map>()
                .map((item) => Map<String, dynamic>.from(item))
                .where(
                  (item) =>
                      item['is_published'] != false &&
                      item['type']?.toString().toLowerCase() != 'holiday',
                )
                .toList()
          : <Map<String, dynamic>>[];

      notices.sort((a, b) {
        final aDate = _noticeDate(a) ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bDate = _noticeDate(b) ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bDate.compareTo(aDate);
      });

      if (!mounted) return;
      setState(() {
        _notices = notices;
        _loading = false;
      });
      _openRequestedNotice();
    } catch (error) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(friendlyError(context, error))));
    }
  }

  void _openRequestedNotice() {
    if (_openedRequestedNotice || widget.noticeId == null) return;

    final index = _notices.indexWhere(
      (notice) => notice['id']?.toString() == widget.noticeId.toString(),
    );
    if (index == -1) return;

    _openedRequestedNotice = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _showNotice(_notices[index]);
    });
  }

  DateTime? _noticeDate(Map<String, dynamic> notice) {
    final value = notice['start_date'] ?? notice['created_at'];
    return value == null
        ? null
        : DateTime.tryParse(value.toString())?.toLocal();
  }

  ({Color color, IconData icon}) _styleFor(String? type) {
    switch (type?.toLowerCase()) {
      case 'urgent':
        return (color: const Color(0xFFDC2626), icon: LucideIcons.siren);
      case 'info':
        return (color: const Color(0xFF0284C7), icon: LucideIcons.info);
      default:
        return (color: const Color(0xFF7C3AED), icon: LucideIcons.megaphone);
    }
  }

  String _dateLabel(Map<String, dynamic> notice) {
    final start = _noticeDate(notice);
    if (start == null) return '';

    final endValue = notice['end_date'];
    final end = endValue == null
        ? null
        : DateTime.tryParse(endValue.toString())?.toLocal();
    if (end != null && !DateUtils.isSameDay(start, end)) {
      return '${DateFormat('d MMM y').format(start)} – '
          '${DateFormat('d MMM y').format(end)}';
    }
    return DateFormat('EEEE, d MMMM y').format(start);
  }

  Future<void> _showNotice(Map<String, dynamic> notice) {
    final type = notice['type']?.toString() ?? 'General';
    final style = _styleFor(type);
    final dateLabel = _dateLabel(notice);

    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => SafeArea(
        child: Container(
          width: double.infinity,
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.8,
          ),
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(height: 22),
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: style.color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(style.icon, color: style.color),
                    ),
                    const SizedBox(width: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: style.color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        type.toUpperCase(),
                        style: GoogleFonts.notoSansKhmer(
                          color: style.color,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  notice['title']?.toString() ?? '',
                  style: GoogleFonts.notoSansKhmer(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF172033),
                  ),
                ),
                if (dateLabel.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(
                        LucideIcons.calendarDays,
                        size: 16,
                        color: Colors.grey.shade500,
                      ),
                      const SizedBox(width: 7),
                      Expanded(
                        child: Text(
                          dateLabel,
                          style: GoogleFonts.notoSansKhmer(
                            color: Colors.grey.shade600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 20),
                Divider(color: Colors.grey.shade200),
                const SizedBox(height: 14),
                Text(
                  notice['content']?.toString() ?? '',
                  style: GoogleFonts.notoSansKhmer(
                    color: const Color(0xFF374151),
                    fontSize: 16,
                    height: 1.65,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
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

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FB),
      appBar: AppBar(
        title: Text(
          l10n.noticeBoard,
          style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF172033),
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchNotices,
              child: _notices.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        const SizedBox(height: 180),
                        Icon(
                          LucideIcons.megaphone,
                          size: 58,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 16),
                        Center(
                          child: Text(
                            l10n.noNoticesFound,
                            style: GoogleFonts.notoSansKhmer(
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(20),
                      itemCount: _notices.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 14),
                      itemBuilder: (context, index) {
                        final notice = _notices[index];
                        final type = notice['type']?.toString() ?? 'General';
                        final style = _styleFor(type);
                        final dateLabel = _dateLabel(notice);
                        final isRequested =
                            widget.noticeId != null &&
                            notice['id']?.toString() ==
                                widget.noticeId.toString();

                        return Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          child: InkWell(
                            onTap: () => _showNotice(notice),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isRequested
                                      ? style.color
                                      : Colors.grey.shade200,
                                  width: isRequested ? 2 : 1,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 14,
                                    offset: const Offset(0, 5),
                                  ),
                                ],
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: style.color.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Icon(
                                      style.icon,
                                      color: style.color,
                                      size: 23,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 8,
                                                    vertical: 3,
                                                  ),
                                              decoration: BoxDecoration(
                                                color: style.color.withValues(
                                                  alpha: 0.09,
                                                ),
                                                borderRadius:
                                                    BorderRadius.circular(12),
                                              ),
                                              child: Text(
                                                type.toUpperCase(),
                                                style:
                                                    GoogleFonts.notoSansKhmer(
                                                      fontSize: 10,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      color: style.color,
                                                    ),
                                              ),
                                            ),
                                            if (dateLabel.isNotEmpty) ...[
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  dateLabel,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                  style:
                                                      GoogleFonts.notoSansKhmer(
                                                        fontSize: 11,
                                                        color: Colors
                                                            .grey
                                                            .shade500,
                                                      ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 9),
                                        Text(
                                          notice['title']?.toString() ?? '',
                                          style: GoogleFonts.notoSansKhmer(
                                            fontSize: 17,
                                            fontWeight: FontWeight.bold,
                                            color: const Color(0xFF172033),
                                          ),
                                        ),
                                        const SizedBox(height: 5),
                                        Text(
                                          notice['content']?.toString() ?? '',
                                          maxLines: 3,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.notoSansKhmer(
                                            fontSize: 13,
                                            height: 1.45,
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Icon(
                                    LucideIcons.chevronRight,
                                    size: 18,
                                    color: Colors.grey.shade400,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
