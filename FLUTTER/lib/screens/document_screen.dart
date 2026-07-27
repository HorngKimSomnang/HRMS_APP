import 'package:flutter/material.dart';

import '../core/error_utils.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/constants.dart';
import '../services/document_service.dart';
import '../l10n/app_localizations.dart';

class DocumentScreen extends StatefulWidget {
  const DocumentScreen({super.key});

  @override
  State<DocumentScreen> createState() => _DocumentScreenState();
}

class _DocumentScreenState extends State<DocumentScreen> {
  final DocumentService _documentService = DocumentService();
  List<dynamic> _documents = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchDocuments();
  }

  Future<void> _fetchDocuments() async {
    try {
      final documents = await _documentService.fetchDocuments();
      if (mounted) {
        setState(() {
          _documents = documents;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(context, e))));
      }
    }
  }

  Future<void> _viewDocument(String path) async {
    // Use the centrally managed Root URL (without /api)
    final String baseUrl = AppConstants.rootUrl;

    final Uri url = Uri.parse('$baseUrl/storage/$path');
    
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.couldNotLaunchDocument)));
      }
    }
  }

  void _showDocumentDetails(BuildContext context, Map<String, dynamic> doc) {
    DateTime date;
    try {
      date = DateTime.parse(doc['created_at'] ?? '');
    } catch (_) {
      date = DateTime.now();
    }
    final formattedDate = DateFormat('MMMM d, yyyy - h:mm a').format(date);
    final String instructions = doc['type'] ?? AppLocalizations.of(context)!.noSpecialInstructions;
    final String uploader = doc['employee']?['name'] ?? AppLocalizations.of(context)!.you;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue[50],
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.fileText, color: Colors.blue, size: 32),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          doc['name'],
                          style: GoogleFonts.notoSansKhmer(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange[100]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(LucideIcons.info, size: 16, color: Colors.orange[800]),
                        const SizedBox(width: 8),
                        Text(
                          AppLocalizations.of(context)!.instructions,
                          style: GoogleFonts.notoSansKhmer(
                            fontSize: 13,
                            color: Colors.orange[900],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      instructions,
                      style: GoogleFonts.notoSansKhmer(
                        fontSize: 14,
                        color: Colors.orange[900],
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              _buildDetailRow(LucideIcons.calendar, AppLocalizations.of(context)!.uploaded, formattedDate),
              const SizedBox(height: 16),
              _buildDetailRow(LucideIcons.user, AppLocalizations.of(context)!.uploadedBy, uploader),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(context); // Close the bottom sheet
                    _viewDocument(doc['file_path']); // Open the document
                  },
                  icon: const Icon(LucideIcons.externalLink, color: Colors.white),
                  label: Text(
                    AppLocalizations.of(context)!.viewDocument,
                    style: GoogleFonts.notoSansKhmer(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue[600],
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey[500]),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: GoogleFonts.notoSansKhmer(
                fontSize: 12,
                color: Colors.grey[500],
                fontWeight: FontWeight.w500,
              ),
            ),
            Text(
              value,
              style: GoogleFonts.notoSansKhmer(
                fontSize: 14,
                color: Colors.black87,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.documents, style: GoogleFonts.notoSansKhmer(color: Colors.black, fontSize: 18, fontWeight: FontWeight.w600)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      backgroundColor: const Color(0xFFF9FAFB),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _documents.isEmpty
              ? Center(child: Text(AppLocalizations.of(context)!.noDocumentsFound, style: GoogleFonts.notoSansKhmer(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _documents.length,
                  itemBuilder: (context, index) {
                    final doc = _documents[index];
                    final date = DateTime.parse(doc['created_at']);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha:0.05), blurRadius: 4, offset: const Offset(0, 2))],
                      ),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.blue[50],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(LucideIcons.fileText, color: Colors.blue),
                        ),
                        title: Text(doc['name'], style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600)),
                        subtitle: Text(
                          DateFormat('MMM d, yyyy').format(date),
                          style: GoogleFonts.notoSansKhmer(color: Colors.grey[600], fontSize: 12),
                        ),
                        onTap: () => _showDocumentDetails(context, doc),
                      ),
                    );
                  },
                ),
    );
  }
}
