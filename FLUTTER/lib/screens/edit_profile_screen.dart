import 'package:flutter/material.dart';

import '../core/error_utils.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';
import '../l10n/app_localizations.dart';

class EditProfileScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  const EditProfileScreen({super.key, required this.user});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _loading = false;

  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _addressController;
  late TextEditingController _nameKhController;
  late TextEditingController _emergencyContactController;

  @override
  void initState() {
    super.initState();
    final employee = widget.user['employee'] ?? {};
    // Split name if needed or use existing fields if available
    // Assuming user['name'] is full name, but employee table has first/last
    _firstNameController = TextEditingController(text: employee['first_name'] ?? '');
    _lastNameController = TextEditingController(text: employee['last_name'] ?? '');
    _emailController = TextEditingController(text: widget.user['email'] ?? '');
    _phoneController = TextEditingController(text: employee['phone'] ?? '');
    _addressController = TextEditingController(text: employee['address'] ?? '');
    _nameKhController = TextEditingController(text: employee['documents']?['name_kh'] ?? '');
    _emergencyContactController = TextEditingController(text: employee['documents']?['emergency_contact'] ?? '');
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    try {
      // We assume the backend UpdateEmployeeRequest accepts these fields
      // and handles the update logic.
      // Note: Backend expects _method: PUT if using FormData, 
      // but standard JSON PUT should work if controller handles it.
      // Let's use JSON for simplicity first.
      
      final employee = widget.user['employee'] ?? {};
      final documents = employee['documents'] ?? {};

      // Fallback logic: if a field is cleared, keep the previous data.
      final newFirstName = _firstNameController.text.trim().isEmpty ? (employee['first_name'] ?? '') : _firstNameController.text.trim();
      final newLastName = _lastNameController.text.trim().isEmpty ? (employee['last_name'] ?? '') : _lastNameController.text.trim();
      final newName = "$newFirstName $newLastName".trim();

      final data = {
        'first_name': newFirstName.isEmpty ? employee['first_name'] : newFirstName,
        'last_name': newLastName.isEmpty ? employee['last_name'] : newLastName,
        'name': newName.isEmpty ? widget.user['name'] : newName,
        'email': _emailController.text.trim().isEmpty ? widget.user['email'] : _emailController.text.trim(),
        'phone': _phoneController.text.trim().isEmpty ? employee['phone'] : _phoneController.text.trim(),
        'address': _addressController.text.trim().isEmpty ? employee['address'] : _addressController.text.trim(),
        'documents': {
           ...documents,
           'name_kh': _nameKhController.text.trim().isEmpty ? documents['name_kh'] : _nameKhController.text.trim(),
           'emergency_contact': _emergencyContactController.text.trim().isEmpty ? documents['emergency_contact'] : _emergencyContactController.text.trim(),
        }
      };

      await _apiService.client.put('/profile/update', data: data);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.profileUpdatedSuccessfully)),
        );
        Navigator.pop(context, true); // Return true to trigger refresh
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(context, e))),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.editProfile, style: GoogleFonts.notoSansKhmer(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionTitle(AppLocalizations.of(context)!.personalInformation),
              const SizedBox(height: 16),
              _buildTextField(label: AppLocalizations.of(context)!.firstName, controller: _firstNameController),
              const SizedBox(height: 16),
              _buildTextField(label: AppLocalizations.of(context)!.lastName, controller: _lastNameController),
              const SizedBox(height: 24),

              _buildSectionTitle(AppLocalizations.of(context)!.contactDetails),
              const SizedBox(height: 16),
              _buildTextField(label: AppLocalizations.of(context)!.email, controller: _emailController, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 16),
              _buildTextField(label: AppLocalizations.of(context)!.phoneNumber, controller: _phoneController, keyboardType: TextInputType.phone),
              const SizedBox(height: 16),
              _buildTextField(label: AppLocalizations.of(context)!.address, controller: _addressController, maxLines: 3),
              const SizedBox(height: 24),

              _buildSectionTitle(AppLocalizations.of(context)!.additionalDetails),
              const SizedBox(height: 16),
              _buildTextField(label: AppLocalizations.of(context)!.khmerName, controller: _nameKhController),
              const SizedBox(height: 16),
              _buildTextField(label: AppLocalizations.of(context)!.emergencyContact, controller: _emergencyContactController, keyboardType: TextInputType.phone),
              
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _loading ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: _loading 
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(AppLocalizations.of(context)!.saveChanges, style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey[800]),
    );
  }

  Widget _buildTextField({
    required String label, 
    required TextEditingController controller, 
    TextInputType? keyboardType,
    int maxLines = 1,
    bool isReadOnly = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text(
            label,
            style: GoogleFonts.notoSansKhmer(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.grey[700]),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(color: const Color(0xFF94A3B8).withValues(alpha:0.05), blurRadius: 10, offset: const Offset(0, 5))
            ],
          ),
          child: TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            maxLines: maxLines,
            readOnly: isReadOnly,
            style: GoogleFonts.notoSansKhmer(fontSize: 14, color: isReadOnly ? Colors.grey[500] : Colors.black87),
            decoration: InputDecoration(
              hintText: label,
              hintStyle: GoogleFonts.notoSansKhmer(color: Colors.grey[400], fontSize: 14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              filled: true,
              fillColor: isReadOnly ? Colors.grey[100] : Colors.white,
            ),
            validator: null,
          ),
        ),
      ],
    );
  }
}
