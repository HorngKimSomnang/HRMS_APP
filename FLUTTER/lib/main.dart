import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'providers/leave_provider.dart';
import 'providers/language_provider.dart';
import 'l10n/app_localizations.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/attendance_screen.dart';
import 'screens/attendance_history_screen.dart';
import 'screens/leave_screen.dart';
import 'screens/task_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/document_screen.dart';
import 'screens/holiday_screen.dart';
import 'screens/overtime_screen.dart';
import 'screens/payslip_screen.dart';
import 'screens/notification_screen.dart';
import 'screens/my_contract_screen.dart';
import 'screens/notice_board_screen.dart';
import 'screens/my_forms_screen.dart';
import 'screens/entity_form_screen.dart';
import 'providers/notification_provider.dart';
import 'screens/main_layout.dart';
import 'core/constants.dart';
import 'core/theme.dart';
import 'services/local_notification_service.dart';
import 'services/api_service.dart';
import 'services/live_version_service.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final localNotifications = LocalNotificationService();
  await localNotifications.init(onNotificationTap: _openNotificationRoute);

  ApiService.onUnauthenticated = (String message) {
    final context = rootNavigatorKey.currentContext;
    if (context != null) {
      try {
        Provider.of<NotificationProvider>(context, listen: false).stopPolling();
      } catch (_) {}
      LiveVersionService.instance.stopPolling();


      GoRouter.of(context).go('/login');
    }
  };

  runApp(const MyApp());
  WidgetsBinding.instance.addPostFrameCallback((_) {
    localNotifications.openInitialNotification();
  });
}

final _router = GoRouter(
  navigatorKey: rootNavigatorKey,
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(
      path: '/forgot-password',
      builder: (context, state) => const ForgotPasswordScreen(),
    ),
    ShellRoute(
      builder: (context, state, child) {
        return MainLayout(child: child);
      },
      routes: [
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardScreen(),
        ),
        GoRoute(
          path: '/attendance',
          builder: (context, state) => const AttendanceScreen(),
        ),
        GoRoute(
          path: '/attendance-history',
          builder: (context, state) => const AttendanceHistoryScreen(),
        ),
        GoRoute(
          path: '/tasks',
          builder: (context, state) => const TaskScreen(),
        ),
        GoRoute(
          path: '/leaves',
          builder: (context, state) => const LeaveScreen(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => ProfileScreen(
            openChangePassword:
                state.uri.queryParameters['openPassword'] == 'true',
          ),
        ),
        GoRoute(
          path: '/documents',
          builder: (context, state) => const DocumentScreen(),
        ),
        GoRoute(
          path: '/holidays',
          builder: (context, state) => const HolidayScreen(),
        ),
        GoRoute(
          path: '/notices',
          builder: (context, state) => NoticeBoardScreen(
            noticeId: int.tryParse(state.uri.queryParameters['notice'] ?? ''),
          ),
        ),
        GoRoute(
          path: '/overtime',
          builder: (context, state) => const OvertimeScreen(),
        ),
        GoRoute(
          path: '/payslips',
          builder: (context, state) => const PayslipScreen(),
        ),
        GoRoute(
          path: '/notifications',
          builder: (context, state) => const NotificationScreen(),
        ),
        GoRoute(
          path: '/my-contract',
          builder: (context, state) => const MyContractScreen(),
        ),
        GoRoute(
          path: '/my-forms',
          builder: (context, state) => const MyFormsScreen(),
        ),
        GoRoute(
          path: '/my-forms/:slug',
          builder: (context, state) => EntityFormScreen(
            slug: state.pathParameters['slug']!,
            recordId: int.tryParse(state.uri.queryParameters['record'] ?? ''),
          ),
        ),
      ],
    ),
  ],
);

void _openNotificationRoute(String? route) {
  if (route == null || !route.startsWith('/')) return;
  _router.go(route);
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => LeaveProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => LanguageProvider()),
      ],
      child: Consumer<LanguageProvider>(
        builder: (context, languageProvider, child) {
          return MaterialApp.router(
            title: AppConstants.appName,
            theme: AppTheme.lightTheme,
            debugShowCheckedModeBanner: false,
            routerConfig: _router,
            locale: languageProvider.currentLocale,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
          );
        },
      ),
    );
  }
}
