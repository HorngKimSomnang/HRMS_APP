import 'package:flutter/material.dart';
import 'package:skeletonizer/skeletonizer.dart';

import '../core/error_utils.dart';
import 'package:intl/intl.dart'; 
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/employee_service.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import '../providers/language_provider.dart';
import '../l10n/app_localizations.dart';
import 'package:dio/dio.dart';
import 'edit_profile_screen.dart';

class ProfileScreen extends StatefulWidget {
  final bool openChangePassword;

  const ProfileScreen({super.key, this.openChangePassword = false});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ApiService _apiService = ApiService();
  final EmployeeService _employeeService = EmployeeService();
  final ImagePicker _picker = ImagePicker();
  
  Map<String, dynamic>? _user;
  bool _loading = true;
  bool _showMoreDetails = false;
  bool _autoOpenedPasswordDialog = false;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
    // Attendance fetch removed as it is no longer shown
  }

  Future<void> _fetchProfile() async {
    try {
      final response = await _apiService.client.get('/user');
      if (mounted) {
        setState(() {
          _user = response.data;
          _loading = false;
        });
        if (widget.openChangePassword && !_autoOpenedPasswordDialog) {
          _autoOpenedPasswordDialog = true;
          _showChangePasswordDialog();
        }
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _updateProfilePicture() async {
     try {
       final XFile? image = await _picker.pickImage(
         source: ImageSource.gallery,
         imageQuality: 60, // Compress image to 60% quality
         maxWidth: 800,    // Resize image to max 800px width
       );
       if (image == null) return;
        
       final employeeId = _user?['employee']?['id'];
       if (employeeId == null) return;

       if (!mounted) return;
       ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.uploadingImage)));

       await _employeeService.uploadProfilePicture(employeeId, File(image.path));
       if (!mounted) return;

       await _fetchProfile();
       if (!mounted) return;

       ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.profilePictureUpdated)));
     } on DioException catch (e) {
       if (mounted) {
         String errMsg = e.response?.data?['message'] ?? AppLocalizations.of(context)!.networkError;
         if (e.response?.data?['errors'] != null) {
           errMsg += ' - ${e.response!.data['errors']}';
         }
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.uploadFailed(errMsg))));
       }
     } catch (e) {
       if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(context, e))));
       }
     }
  }

  String _getSafeString(dynamic value) {
    if (value == null) return AppLocalizations.of(context)!.notApplicable;
    if (value is Map) {
      return value['name']?.toString() ?? AppLocalizations.of(context)!.notApplicable;
    }
    return value.toString();
  }

  Future<void> _showChangePasswordDialog() async {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    bool isLoading = false;
    String? errorMsg;

    bool needsPasswordChange = _user?['needs_password_change'] == true;

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text(AppLocalizations.of(context)!.changePassword, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.bold)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (errorMsg != null) ...[
                      Text(errorMsg!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 10),
                    ],
                    if (!needsPasswordChange) ...[
                      TextField(
                        controller: currentPasswordController,
                        obscureText: true,
                        decoration: InputDecoration(labelText: AppLocalizations.of(context)!.currentPassword),
                      ),
                      const SizedBox(height: 10),
                    ],
                    TextField(
                      controller: newPasswordController,
                      obscureText: true,
                      decoration: InputDecoration(labelText: AppLocalizations.of(context)!.newPassword),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: confirmPasswordController,
                      obscureText: true,
                      decoration: InputDecoration(labelText: AppLocalizations.of(context)!.confirmNewPassword),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text(AppLocalizations.of(context)!.cancel),
                ),
                ElevatedButton(
                  onPressed: isLoading ? null : () async {
                    if (newPasswordController.text != confirmPasswordController.text) {
                      setState(() => errorMsg = AppLocalizations.of(context)!.passwordsDoNotMatch);
                      return;
                    }
                    if (newPasswordController.text.length < 6) {
                      setState(() => errorMsg = AppLocalizations.of(context)!.passwordMinLength);
                      return;
                    }
                    setState(() { isLoading = true; errorMsg = null; });
                    try {
                      final data = {
                        'password': newPasswordController.text,
                        'password_confirmation': confirmPasswordController.text,
                      };
                      if (!needsPasswordChange) {
                        data['current_password'] = currentPasswordController.text;
                      }

                      await _apiService.client.post('/change-password', data: data);
                      if (!ctx.mounted) return;
                      Navigator.pop(ctx);
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.passwordChangedSuccessfully)));
                      _fetchProfile(); // refresh profile to update needs_password_change flag
                    } on DioException catch (e) {
                      setState(() { 
                        isLoading = false; 
                        errorMsg = friendlyError(context, e); 
                      });
                    } catch (e) {
                      setState(() { isLoading = false; errorMsg = friendlyError(context, e); });
                    }
                  },
                  child: isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator()) : Text(AppLocalizations.of(context)!.save),
                ),
              ],
            );
          }
        );
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    final displayUser = _loading ? {
      'name': 'Loading Name',
      'email': 'loading@example.com',
      'needs_password_change': false,
      'employee': {
        'employee_code': 'EMP000',
        'joining_date': null,
        'department': 'Department',
        'job_title': 'Job Title',
        'phone': null,
        'profile_picture_url': null,
        'documents': {'name_kh': 'N/A', 'emergency_contact': 'N/A'},
      },
    } : _user;

    final employee = displayUser?['employee'] as Map<String, dynamic>?;

    return Skeletonizer(
      enabled: _loading,
      child: Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: SingleChildScrollView(
        child: Column(
          children: [
            Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.bottomCenter,
              children: [
                // 1. Premium Header Background
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.only(top: 60, bottom: 120), // Increased to 120 to prevent overlap
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF0EA5E9), Color(0xFF2563EB)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(32),
                      bottomRight: Radius.circular(32),
                    ),
                    boxShadow: [
                      BoxShadow(color: Color(0x332563EB), blurRadius: 24, offset: Offset(0, 12))
                    ],
                  ),
                  child: Stack(
                    children: [
                      // Centered Content (Avatar + Text)
                      Align(
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Stack(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white.withValues(alpha:0.2),
                                    border: Border.all(color: Colors.white, width: 2),
                                  ),
                                  child: CircleAvatar(
                                    radius: 44,
                                    backgroundColor: Colors.white,
                                    backgroundImage: employee?['profile_picture_url'] != null 
                                        ? NetworkImage(employee!['profile_picture_url']) 
                                        : null,
                                    child: employee?['profile_picture_url'] == null 
                                        ? const Icon(LucideIcons.user, size: 44, color: Color(0xFF2563EB))
                                        : null,
                                  ),
                                ),
                                Positioned(
                                  bottom: 0,
                                  right: 0,
                                  child: GestureDetector(
                                    onTap: _updateProfilePicture,
                                    child: Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        shape: BoxShape.circle,
                                        boxShadow: [
                                          BoxShadow(color: Colors.black.withValues(alpha:0.1), blurRadius: 6)
                                        ]
                                      ),
                                      child: const Icon(LucideIcons.camera, size: 16, color: Color(0xFF2563EB)),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              displayUser?['name'] ?? AppLocalizations.of(context)!.userFallback,
                              style: GoogleFonts.notoSansKhmer(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                height: 1.2,
                              ),
                            ),
                            Text(
                              employee?['phone'] ?? displayUser?['email'] ?? '',
                              style: GoogleFonts.notoSansKhmer(
                                fontSize: 14,
                                color: Colors.white.withValues(alpha:0.9),
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      // Edit Button (Top Right)
                      Positioned(
                        top: 0,
                        right: 20,
                        child: IconButton(
                          icon: const Icon(LucideIcons.pencil, color: Colors.white),
                          onPressed: _loading ? null : () async {
                            final result = await Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => EditProfileScreen(user: _user!)),
                            );
                            if (result == true) _fetchProfile();
                          },
                        ),
                      ),
                    ],
                  ),
                ),

                // 2. Info Cards (Overlapping)
                Positioned(
                  bottom: -40, // Pull cards down to overlap
                  left: 20,
                  right: 20,
                  child: Row(
                    children: [
                       Expanded(child: _InfoCard(
                         label: AppLocalizations.of(context)!.empCode,
                         value: employee?['employee_code'] ?? '000',
                         icon: LucideIcons.badgeCheck,
                         color: Colors.blue,
                       )),
                       const SizedBox(width: 16),
                       Expanded(child: _InfoCard(
                         label: AppLocalizations.of(context)!.joined,
                         value: employee?['joining_date'] != null
                            ? DateFormat('d MMM y').format(DateTime.parse(employee!['joining_date']))
                            : '-',
                         icon: LucideIcons.calendar,
                         color: Colors.orange,
                       )),
                    ],
                  ),
                ),
              ],
            ),

            // Spacer for the overlapping cards
            const SizedBox(height: 56),

            // 3. Employment Details
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF94A3B8).withValues(alpha:0.05), blurRadius: 16, offset: const Offset(0, 8))
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(AppLocalizations.of(context)!.employmentDetails, style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 20),
                    _DetailRow(AppLocalizations.of(context)!.department, _getSafeString(employee?['department'])),
                    const Divider(height: 32, color: Color(0xFFF1F5F9)),
                    _DetailRow(AppLocalizations.of(context)!.jobTitle, employee?['job_title'] ?? AppLocalizations.of(context)!.notApplicable),
                    const Divider(height: 32, color: Color(0xFFF1F5F9)),
                    _DetailRow(AppLocalizations.of(context)!.email, displayUser?['email'] ?? AppLocalizations.of(context)!.notApplicable),

                    if (_showMoreDetails) ...[
                      const Divider(height: 32, color: Color(0xFFF1F5F9)),
                      _DetailRow(AppLocalizations.of(context)!.khmerName, employee?['documents']?['name_kh'] ?? AppLocalizations.of(context)!.notApplicable),
                      const Divider(height: 32, color: Color(0xFFF1F5F9)),
                      _DetailRow(AppLocalizations.of(context)!.emergencyContact, employee?['documents']?['emergency_contact'] ?? AppLocalizations.of(context)!.notApplicable),
                    ],

                    const SizedBox(height: 16),
                    Center(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _showMoreDetails = !_showMoreDetails;
                          });
                        },
                        child: Text(
                          _showMoreDetails ? AppLocalizations.of(context)!.viewLess : AppLocalizations.of(context)!.viewMoreDetails,
                          style: GoogleFonts.notoSansKhmer(
                            color: Colors.blue,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // 4. My Activity — content you view/submit yourself, kept apart from app Settings below
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Text(AppLocalizations.of(context)!.myActivity, style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey[800])),
                   const SizedBox(height: 16),
                   Container(
                     decoration: BoxDecoration(
                       color: Colors.white,
                       borderRadius: BorderRadius.circular(24),
                       boxShadow: [ BoxShadow(color: const Color(0xFF94A3B8).withValues(alpha:0.05), blurRadius: 10, offset: const Offset(0, 5)) ],
                     ),
                     child: Column(
                       children: [
                         _SettingTile(
                           icon: LucideIcons.fileSignature,
                           color: const Color(0xFF8B5CF6),
                           title: AppLocalizations.of(context)!.myContract,
                           onTap: () => context.push('/my-contract'),
                         ),
                         const Divider(height: 1, color: Color(0xFFF1F5F9)),
                         _SettingTile(
                           icon: LucideIcons.clipboardList,
                           color: const Color(0xFF14B8A6),
                           title: AppLocalizations.of(context)!.myForms,
                           subtitle: AppLocalizations.of(context)!.submitReportsAndForms,
                           onTap: () => context.push('/my-forms'),
                         ),
                       ],
                     ),
                   ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 5. Settings — app-level preferences and account actions
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Text(AppLocalizations.of(context)!.settings, style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey[800])),
                   const SizedBox(height: 16),
                   Container(
                     decoration: BoxDecoration(
                       color: Colors.white,
                       borderRadius: BorderRadius.circular(24),
                       boxShadow: [ BoxShadow(color: const Color(0xFF94A3B8).withValues(alpha:0.05), blurRadius: 10, offset: const Offset(0, 5)) ],
                     ),
                     child: Column(
                       children: [
                         _SettingTile(
                           icon: Icons.language,
                           color: const Color(0xFFF59E0B),
                           title: AppLocalizations.of(context)!.language,
                           onTap: () {
                              final current = Provider.of<LanguageProvider>(context, listen: false).currentLocale.languageCode;
                              final newLang = current == 'en' ? 'km' : 'en';
                              Provider.of<LanguageProvider>(context, listen: false).changeLanguage(Locale(newLang));
                           },
                         ),
                         const Divider(height: 1, color: Color(0xFFF1F5F9)),
                         _SettingTile(
                           icon: LucideIcons.key,
                           color: const Color(0xFF3B82F6),
                           title: AppLocalizations.of(context)!.changePassword,
                           onTap: _showChangePasswordDialog,
                         ),
                         const Divider(height: 1, color: Color(0xFFF1F5F9)),
                         _SettingTile(
                           icon: LucideIcons.logOut,
                           color: const Color(0xFFEF4444),
                           title: AppLocalizations.of(context)!.logout,
                           hideArrow: true,
                           onTap: () {
                              Provider.of<AuthProvider>(context, listen: false).logout();
                              context.go('/login');
                           },
                         ),
                       ],
                     ),
                   ),
                ],
              ), // End Column

             ), // End Stack (Header Content)
            
            const SizedBox(height: 40),
          ],
        ),
      ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _InfoCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: const Color(0xFF94A3B8).withValues(alpha:0.1), blurRadius: 20, offset: const Offset(0, 10))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha:0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 16),
          Text(value, style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87)),
          Text(label, style: GoogleFonts.notoSansKhmer(fontSize: 13, color: Colors.grey)),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.notoSansKhmer(color: Colors.grey[600], fontSize: 14)),
        Flexible(
          child: Text(
            value, 
            style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 14, color: Colors.black87),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class _SettingTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  final bool hideArrow;

  const _SettingTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.hideArrow = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha:0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600, fontSize: 15, color: Colors.black87)),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(subtitle!, style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.grey[500])),
                  ],
                ],
              ),
            ),
            if (!hideArrow) Icon(LucideIcons.chevronRight, color: Colors.grey[300], size: 20),
          ],
        ),
      ),
    );
  }
}
