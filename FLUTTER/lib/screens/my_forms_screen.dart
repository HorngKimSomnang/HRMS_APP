import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../services/custom_entity_service.dart';
import '../l10n/app_localizations.dart';

class MyFormsScreen extends StatefulWidget {
  const MyFormsScreen({super.key});

  @override
  State<MyFormsScreen> createState() => _MyFormsScreenState();
}

class _MyFormsScreenState extends State<MyFormsScreen> {
  final CustomEntityService _service = CustomEntityService();
  List<dynamic> _entities = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final entities = await _service.fetchSubmittableEntities();
      if (!mounted) return;
      // Skip the picker entirely when there's only one form to fill out —
      // no reason to make that a separate tap. Falls back to the list once
      // a second submittable entity exists.
      if (entities.length == 1) {
        context.replace('/my-forms/${entities[0]['slug']}');
        return;
      }
      setState(() { _entities = entities; _loading = false; });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.myForms, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600)),
        centerTitle: true,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      // A skeleton-shaped list here would flash for a moment then get replaced by the
      // form screen's own skeleton whenever there's exactly one submittable entity (the
      // common case, since _load() redirects straight past this screen) — two different
      // skeleton shapes back to back reads as broken. A plain spinner keeps that a single
      // smooth transition into the form instead.
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)));
    }

    if (_entities.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.clipboardList, size: 48, color: Colors.grey[300]),
            const SizedBox(height: 12),
            Text(AppLocalizations.of(context)!.noFormsAvailable, style: GoogleFonts.notoSansKhmer(color: Colors.grey)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _entities.length,
      itemBuilder: (context, index) {
        final entity = _entities[index];
        return InkWell(
          onTap: () => context.push('/my-forms/${entity['slug']}'),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
              border: Border.all(color: Colors.grey.shade100),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(LucideIcons.fileEdit, color: Color(0xFF2563EB), size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(entity['name'] ?? '', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 14)),
                      if ((entity['description'] ?? '').toString().isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          entity['description'],
                          style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.grey[600]),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                const Icon(LucideIcons.chevronRight, size: 18, color: Colors.grey),
              ],
            ),
          ),
        );
      },
    );
  }
}
