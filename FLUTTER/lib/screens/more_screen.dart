import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../core/theme.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.read<AuthProvider>();
    final user = authProvider.user;

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              // ── Profile Hero Card ──────────────────────────────
              Container(
                width: double.infinity,
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF3B82F6).withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Avatar
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.25),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2),
                      ),
                      child: Center(
                        child: Text(
                          (user?['name'] ?? 'U')[0].toUpperCase(),
                          style: GoogleFonts.notoSansKhmer(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?['name'] ?? 'Employee',
                            style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          Text(
                            user?['email'] ?? '',
                            style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.white70),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              (user?['roles'] as List?)?.firstOrNull?['name'] ?? 'Employee',
                              style: GoogleFonts.notoSansKhmer(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => context.push('/profile'),
                      icon: const Icon(LucideIcons.edit3, color: Colors.white70, size: 20),
                    ),
                  ],
                ),
              ),

              // ── Quick Actions ──────────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Quick Access', style: GoogleFonts.notoSansKhmer(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondaryLight, letterSpacing: 0.8)),
                    const SizedBox(height: 10),
                    _MenuSection(items: [
                      _MenuItem(icon: LucideIcons.user, label: 'My Profile', subtitle: 'View & edit your info', color: const Color(0xFF3B82F6), onTap: () => context.push('/profile')),
                      _MenuItem(icon: LucideIcons.fileSignature, label: 'My Contract', subtitle: 'Contract type & dates', color: const Color(0xFF8B5CF6), onTap: () => context.push('/my-contract')),
                      _MenuItem(icon: LucideIcons.mapPin, label: 'Attendance', subtitle: 'Clock in & out', color: const Color(0xFF10B981), onTap: () => context.push('/attendance')),
                      _MenuItem(icon: LucideIcons.fileText, label: 'Documents', subtitle: 'HR documents', color: const Color(0xFFF59E0B), onTap: () => context.push('/documents')),
                      _MenuItem(icon: LucideIcons.clipboardList, label: 'My Forms', subtitle: 'Submit reports & forms', color: const Color(0xFF14B8A6), onTap: () => context.push('/my-forms')),
                    ]),

                    const SizedBox(height: 20),
                    Text('Account', style: GoogleFonts.notoSansKhmer(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondaryLight, letterSpacing: 0.8)),
                    const SizedBox(height: 10),
                    _MenuSection(items: [
                      _MenuItem(
                        icon: LucideIcons.logOut,
                        label: 'Logout',
                        subtitle: 'Sign out of your account',
                        color: const Color(0xFFEF4444),
                        onTap: () async {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (_) => AlertDialog(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              title: Text('Logout', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold)),
                              content: Text('Are you sure you want to sign out?', style: GoogleFonts.notoSansKhmer()),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(context, false), child: Text('Cancel', style: GoogleFonts.notoSansKhmer(color: Colors.grey))),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                                  onPressed: () => Navigator.pop(context, true),
                                  child: Text('Logout', style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600)),
                                ),
                              ],
                            ),
                          );
                          if (confirm == true && context.mounted) {
                            await authProvider.logout();
                            if (context.mounted) context.go('/login');
                          }
                        },
                      ),
                    ]),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuSection extends StatelessWidget {
  final List<_MenuItem> items;
  const _MenuSection({required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 2))],
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final i = entry.key;
          final item = entry.value;
          return Column(
            children: [
              ListTile(
                onTap: item.onTap,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                leading: Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: item.color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(item.icon, color: item.color, size: 19),
                ),
                title: Text(item.label, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.textPrimaryLight)),
                subtitle: Text(item.subtitle, style: GoogleFonts.notoSansKhmer(fontSize: 11, color: AppTheme.textSecondaryLight)),
                trailing: Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey.shade400),
              ),
              if (i < items.length - 1) Divider(height: 1, indent: 60, endIndent: 16, color: Colors.grey.shade100),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
  const _MenuItem({required this.icon, required this.label, required this.subtitle, required this.color, required this.onTap});
}
