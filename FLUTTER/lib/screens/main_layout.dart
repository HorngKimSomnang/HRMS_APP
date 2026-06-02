import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import '../l10n/app_localizations.dart';

class MainLayout extends StatelessWidget {
  final Widget child;

  const MainLayout({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha:0.2), // Darker shadow for dark mode
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            indicatorColor: Theme.of(context).primaryColor.withValues(alpha:0.2),
            labelTextStyle: WidgetStateProperty.resolveWith((states) {
               if (states.contains(WidgetState.selected)) {
                 return GoogleFonts.notoSansKhmer(fontSize: 12, fontWeight: FontWeight.w600, color: Theme.of(context).primaryColor);
               }
               return GoogleFonts.notoSansKhmer(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey);
            }),
            iconTheme: WidgetStateProperty.resolveWith((states) {
               if (states.contains(WidgetState.selected)) {
                 return IconThemeData(color: Theme.of(context).primaryColor, size: 24);
               }
               return const IconThemeData(color: Colors.grey, size: 24);
            }),
          ),
          child: NavigationBar(
            height: 70,
            backgroundColor: Theme.of(context).cardColor, // Use theme card color
            elevation: 0,
            selectedIndex: _calculateSelectedIndex(context),
            onDestinationSelected: (int idx) => _onItemTapped(idx, context),
            destinations: [
              NavigationDestination(icon: Icon(LucideIcons.layoutGrid), label: AppLocalizations.of(context)!.home),
              NavigationDestination(icon: Icon(LucideIcons.checkSquare), label: AppLocalizations.of(context)!.task),
              NavigationDestination(icon: Icon(LucideIcons.calendar), label: AppLocalizations.of(context)!.leave),
              NavigationDestination(icon: Icon(LucideIcons.user), label: AppLocalizations.of(context)!.profile),
            ],
          ),
        ),
      ),
    );
  }

  static int _calculateSelectedIndex(BuildContext context) {
    final String location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/tasks')) return 1;
    if (location.startsWith('/leaves')) return 2;
    if (location.startsWith('/more')) return 3;
    if (location.startsWith('/payroll')) return 3;
    if (location.startsWith('/profile')) return 3;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/tasks');
        break;
      case 2:
        context.go('/leaves');
        break;
      case 3:
        context.go('/profile');
        break;
    }
  }
}
