import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';

class DateSelector extends StatelessWidget {
  final DateTime? date;
  final VoidCallback onTap;
  final String placeholder;

  const DateSelector({super.key, required this.date, required this.onTap, this.placeholder = 'Select date'});

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
                date == null ? placeholder : DateFormat('dd MMM yyyy').format(date!),
                style: GoogleFonts.notoSansKhmer(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: date == null ? Colors.grey[400] : Colors.black87,
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

/// Shows the app's themed date picker (blue accent matching the rest of the app)
/// and returns the picked date, or null if cancelled.
Future<DateTime?> showAppDatePicker(BuildContext context, {DateTime? initialDate, DateTime? firstDate, DateTime? lastDate}) {
  return showDatePicker(
    context: context,
    initialDate: initialDate ?? DateTime.now(),
    firstDate: firstDate ?? DateTime(2020),
    lastDate: lastDate ?? DateTime(2030),
    builder: (context, child) {
      return Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: Color(0xFF2563EB)),
        ),
        child: child!,
      );
    },
  );
}
