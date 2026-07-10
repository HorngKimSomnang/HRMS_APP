import 'package:flutter/material.dart';

import '../core/error_utils.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

class DocumentViewerScreen extends StatelessWidget {
  final String fileUrl;
  final String fileName;

  const DocumentViewerScreen({
    super.key,
    required this.fileUrl,
    required this.fileName,
  });

  bool _isImage(String url) {
    final lower = url.toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || 
           lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.webp');
  }

  @override
  Widget build(BuildContext context) {
    final isImg = _isImage(fileUrl) || _isImage(fileName);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          fileName, 
          style: GoogleFonts.notoSansKhmer(color: Colors.white, fontSize: 16),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.externalLink),
            onPressed: () async {
              final uri = Uri.parse(fileUrl);
              try {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(friendlyError(context, e))),
                  );
                }
              }
            },
          ),
        ],
      ),
      body: Center(
        child: isImg 
          ? InteractiveViewer(
              panEnabled: true,
              minScale: 0.5,
              maxScale: 4,
              child: Image.network(
                fileUrl,
                fit: BoxFit.contain,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return const Center(child: CircularProgressIndicator(color: Colors.white));
                },
                errorBuilder: (context, error, stackTrace) {
                  return Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.fileWarning, color: Colors.red, size: 48),
                      const SizedBox(height: 16),
                      Text('Failed to load image', style: GoogleFonts.notoSansKhmer(color: Colors.white)),
                    ],
                  );
                },
              ),
            )
          : Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(LucideIcons.fileText, color: Colors.white54, size: 64),
                const SizedBox(height: 24),
                Text(
                  'Cannot preview this file type in-app.',
                  style: GoogleFonts.notoSansKhmer(color: Colors.white, fontSize: 16),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  icon: const Icon(LucideIcons.externalLink),
                  label: Text('Open Externally', style: GoogleFonts.notoSansKhmer()),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  onPressed: () async {
                    final uri = Uri.parse(fileUrl);
                    try {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(friendlyError(context, e))),
                        );
                      }
                    }
                  },
                ),
              ],
            ),
      ),
    );
  }
}
