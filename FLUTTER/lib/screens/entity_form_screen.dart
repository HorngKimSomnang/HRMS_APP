import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:skeletonizer/skeletonizer.dart';

import '../core/error_utils.dart';
import '../services/custom_entity_service.dart';
import '../widgets/date_selector.dart';
import '../l10n/app_localizations.dart';

class EntityFormScreen extends StatefulWidget {
  final String slug;
  const EntityFormScreen({super.key, required this.slug});

  @override
  State<EntityFormScreen> createState() => _EntityFormScreenState();
}

class _EntityFormScreenState extends State<EntityFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final CustomEntityService _service = CustomEntityService();

  bool _loading = true;
  bool _submitting = false;
  Map<String, dynamic>? _entity;
  final Map<String, dynamic> _values = {};
  final Map<String, TextEditingController> _controllers = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  List<dynamic> get _fields {
    final fields = (_entity?['fields'] as List<dynamic>?) ?? [];
    // File attachments aren't supported from the mobile app yet — only a web upload flow exists.
    return fields.where((f) => f['type'] != 'file').toList();
  }

  Future<void> _load() async {
    try {
      final entity = await _service.fetchEntity(widget.slug);
      if (!mounted) return;
      setState(() {
        _entity = entity;
        _loading = false;
      });
      for (final field in _fields) {
        final key = field['key'] as String;
        if (field['type'] == 'boolean') {
          _values[key] = false;
        } else if (field['type'] != 'date') {
          _controllers[key] = TextEditingController();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(context, e))));
      }
    }
  }

  Future<void> _pickDate(String key) async {
    final picked = await showAppDatePicker(context, initialDate: _values[key] as DateTime? ?? DateTime.now());
    if (picked != null) setState(() => _values[key] = picked);
  }

  void _clearForm() {
    for (final c in _controllers.values) {
      c.clear();
    }
    setState(() {
      for (final field in _fields) {
        final key = field['key'] as String;
        _values[key] = field['type'] == 'boolean' ? false : null;
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _submitting = true);
    try {
      final payload = <String, dynamic>{};
      for (final field in _fields) {
        final key = field['key'] as String;
        final type = field['type'] as String;
        if (type == 'date') {
          final date = _values[key] as DateTime?;
          payload[key] = date == null ? null : DateFormat('yyyy-MM-dd').format(date);
        } else if (type == 'boolean') {
          payload[key] = _values[key] ?? false;
        } else if (type == 'number') {
          final text = _controllers[key]?.text ?? '';
          payload[key] = text.isEmpty ? null : num.tryParse(text);
        } else {
          payload[key] = _controllers[key]?.text;
        }
      }

      await _service.submitRecord(widget.slug, payload);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.submittedSuccessfully)));
      _clearForm();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(context, e))));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showHistory() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RecordHistorySheet(slug: widget.slug, fields: _fields),
    );
  }

  Widget _fieldLabel(Map field) {
    return Text(
      '${field['label']}${field['is_required'] == true ? ' *' : ''}',
      style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500),
    );
  }

  BoxDecoration get _cardDecoration => BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
        border: Border.all(color: Colors.grey.shade100),
      );

  /// Shown while the entity/fields are still loading — mirrors the real
  /// form's shape (label + input-box, repeated, then a submit button) so
  /// Skeletonizer has actual content to shimmer instead of blank space.
  Widget _buildLoadingPlaceholder() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < 3; i++) ...[
            Text('Field label', style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            Container(height: 52, decoration: _cardDecoration),
            const SizedBox(height: 20),
          ],
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            height: 56,
            decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(16)),
          ),
        ],
      ),
    );
  }

  Widget _buildField(Map field) {
    final key = field['key'] as String;
    final isRequired = field['is_required'] == true;

    switch (field['type']) {
      case 'text':
        return Container(
          decoration: _cardDecoration,
          child: TextFormField(
            controller: _controllers[key],
            decoration: const InputDecoration(border: InputBorder.none, contentPadding: EdgeInsets.all(16)),
            style: GoogleFonts.notoSansKhmer(),
            validator: (v) => isRequired && (v == null || v.isEmpty) ? AppLocalizations.of(context)!.required : null,
          ),
        );
      case 'textarea':
        return Container(
          decoration: _cardDecoration,
          child: TextFormField(
            controller: _controllers[key],
            maxLines: 4,
            decoration: const InputDecoration(border: InputBorder.none, contentPadding: EdgeInsets.all(16)),
            style: GoogleFonts.notoSansKhmer(),
            validator: (v) => isRequired && (v == null || v.isEmpty) ? AppLocalizations.of(context)!.required : null,
          ),
        );
      case 'number':
        return Container(
          decoration: _cardDecoration,
          child: TextFormField(
            controller: _controllers[key],
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
            decoration: const InputDecoration(border: InputBorder.none, contentPadding: EdgeInsets.all(16)),
            style: GoogleFonts.notoSansKhmer(),
            validator: (v) {
              if (isRequired && (v == null || v.isEmpty)) return AppLocalizations.of(context)!.required;
              if (v != null && v.isNotEmpty && double.tryParse(v) == null) return AppLocalizations.of(context)!.enterValidNumber;
              return null;
            },
          ),
        );
      case 'date':
        return DateSelector(date: _values[key] as DateTime?, onTap: () => _pickDate(key), placeholder: AppLocalizations.of(context)!.selectDate);
      case 'boolean':
        return Container(
          decoration: _cardDecoration,
          child: SwitchListTile(
            value: (_values[key] as bool?) ?? false,
            onChanged: (v) => setState(() => _values[key] = v),
            activeColor: const Color(0xFF2563EB),
            title: Text(AppLocalizations.of(context)!.yes, style: GoogleFonts.notoSansKhmer(fontSize: 13)),
          ),
        );
      case 'dropdown':
        final options = (field['options'] as List<dynamic>? ?? []);
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: _cardDecoration,
          child: DropdownButtonHideUnderline(
            child: DropdownButtonFormField<String>(
              value: _values[key] as String?,
              decoration: const InputDecoration(border: InputBorder.none, icon: Icon(LucideIcons.list, size: 18, color: Color(0xFF2563EB))),
              hint: Text(AppLocalizations.of(context)!.select, style: GoogleFonts.notoSansKhmer(color: Colors.grey[400])),
              items: options.map<DropdownMenuItem<String>>((opt) {
                return DropdownMenuItem<String>(value: opt as String, child: Text(opt, style: GoogleFonts.notoSansKhmer()));
              }).toList(),
              onChanged: (v) => setState(() => _values[key] = v),
              validator: (v) => isRequired && v == null ? AppLocalizations.of(context)!.required : null,
            ),
          ),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(_entity?['name'] ?? '', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600)),
        centerTitle: true,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.history, color: Color(0xFF2563EB)),
            tooltip: AppLocalizations.of(context)!.history,
            onPressed: _loading ? null : _showHistory,
          ),
        ],
      ),
      body: Skeletonizer(
        enabled: _loading,
        child: _loading || _entity == null
            ? _buildLoadingPlaceholder()
            : SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if ((_entity?['description'] ?? '').toString().isNotEmpty) ...[
                        Text(_entity!['description'], style: GoogleFonts.notoSansKhmer(fontSize: 13, color: Colors.grey[600])),
                        const SizedBox(height: 20),
                      ],
                      for (final field in _fields) ...[
                        _fieldLabel(field),
                        const SizedBox(height: 8),
                        _buildField(field),
                        const SizedBox(height: 20),
                      ],
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submit,
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
                                    Text(AppLocalizations.of(context)!.submit, style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.w700)),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}

class _RecordHistorySheet extends StatefulWidget {
  final String slug;
  final List<dynamic> fields;
  const _RecordHistorySheet({required this.slug, required this.fields});

  @override
  State<_RecordHistorySheet> createState() => _RecordHistorySheetState();
}

class _RecordHistorySheetState extends State<_RecordHistorySheet> {
  final CustomEntityService _service = CustomEntityService();
  List<dynamic> _records = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final records = await _service.fetchMyRecords(widget.slug);
      if (mounted) setState(() { _records = records; _loading = false; });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      return DateFormat('MMM dd, yyyy').format(DateTime.parse(dateStr));
    } catch (_) {
      return dateStr;
    }
  }

  String _summaryFor(Map record) {
    final rawData = record['data'];
    final data = rawData is Map ? Map<String, dynamic>.from(rawData) : <String, dynamic>{};
    for (final field in widget.fields) {
      final value = data[field['key']];
      if (value != null && value.toString().isNotEmpty) return value.toString();
    }
    return AppLocalizations.of(context)!.submissionLabel;
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
                child: Text(AppLocalizations.of(context)!.mySubmissions, style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              Expanded(
                child: Skeletonizer(
                  enabled: _loading,
                  child: (_records.isEmpty && !_loading)
                      ? Center(child: Text(AppLocalizations.of(context)!.noSubmissionsYet, style: GoogleFonts.notoSansKhmer(color: Colors.grey)))
                      : ListView.builder(
                          controller: controller,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          itemCount: _loading ? 3 : _records.length,
                          itemBuilder: (context, index) {
                            final record = _loading
                                ? <String, dynamic>{'data': <String, dynamic>{}, 'created_at': '2026-01-01'}
                                : _records[index] as Map<String, dynamic>;
                            final adminReply = record['admin_reply'] as Map<String, dynamic>?;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              decoration: BoxDecoration(
                                color: Colors.grey[50],
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.grey.shade200),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ListTile(
                                    leading: Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(color: const Color(0xFF2563EB).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                                      child: const Icon(LucideIcons.fileText, color: Color(0xFF2563EB), size: 20),
                                    ),
                                    title: Text(_summaryFor(record), style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                                    subtitle: Text(_formatDate(record['created_at']), style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.grey[600])),
                                  ),
                                  if (adminReply != null)
                                    Container(
                                      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF14B8A6).withValues(alpha: 0.08),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFF14B8A6).withValues(alpha: 0.25)),
                                      ),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Icon(LucideIcons.messageSquare, size: 14, color: Color(0xFF14B8A6)),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(adminReply['message']?.toString() ?? '', style: GoogleFonts.notoSansKhmer(fontSize: 13, color: Colors.black87)),
                                                const SizedBox(height: 2),
                                                Text(adminReply['replied_by']?.toString() ?? AppLocalizations.of(context)!.adminFallback, style: GoogleFonts.notoSansKhmer(fontSize: 11, color: Colors.grey[600])),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
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
