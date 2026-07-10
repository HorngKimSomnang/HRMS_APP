import 'package:flutter/material.dart';

import '../core/error_utils.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:skeletonizer/skeletonizer.dart';
import '../l10n/app_localizations.dart';
import '../services/task_service.dart';
import '../core/constants.dart';

class TaskScreen extends StatefulWidget {
  const TaskScreen({super.key});

  @override
  State<TaskScreen> createState() => _TaskScreenState();
}

class _TaskScreenState extends State<TaskScreen> {
  final TaskService _taskService = TaskService();
  List<dynamic> _tasks = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchTasks();
  }

  Future<void> _fetchTasks() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _taskService.fetchTasks();
      if (mounted) {
        setState(() {
          _tasks = data;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = friendlyError(context, e);
        });
      }
    }
  }

  Future<String?> _pickAttachment(BuildContext context) async {
    return await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text('Attach Proof', style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            ListTile(
              leading: const Icon(LucideIcons.camera, color: Colors.blue),
              title: Text('Take Photo', style: GoogleFonts.notoSansKhmer()),
              onTap: () async {
                final file = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 70);
                if (!ctx.mounted) return;
                Navigator.pop(ctx, file?.path);
              },
            ),
            ListTile(
              leading: const Icon(LucideIcons.video, color: Colors.red),
              title: Text('Record Video', style: GoogleFonts.notoSansKhmer()),
              onTap: () async {
                final file = await ImagePicker().pickVideo(source: ImageSource.camera);
                if (!ctx.mounted) return;
                Navigator.pop(ctx, file?.path);
              },
            ),
            ListTile(
              leading: const Icon(LucideIcons.image, color: Colors.green),
              title: Text('Choose Photo from Gallery', style: GoogleFonts.notoSansKhmer()),
              onTap: () async {
                final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 70);
                if (!ctx.mounted) return;
                Navigator.pop(ctx, file?.path);
              },
            ),
            ListTile(
              leading: const Icon(LucideIcons.film, color: Colors.purple),
              title: Text('Choose Video from Gallery', style: GoogleFonts.notoSansKhmer()),
              onTap: () async {
                final file = await ImagePicker().pickVideo(source: ImageSource.gallery);
                if (!ctx.mounted) return;
                Navigator.pop(ctx, file?.path);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggleStatus(dynamic task) async {
    final isCompleted = task['status'] == 'completed';
    final newStatus = isCompleted ? 'in_progress' : 'completed';
    
    String? localFilePath;
    
    if (newStatus == 'completed') {
      if (mounted) {
        final bool? doUpload = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Attach Proof?'),
            content: const Text('Would you like to attach a photo or video of your completed task?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Skip')),
              ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Attach Media')),
            ],
          )
        );
        
        if (doUpload == true) {
          if (!mounted) return;
          localFilePath = await _pickAttachment(context);
        }
      }
    }
    
    setState(() {
      task['status'] = newStatus;
      if (newStatus == 'in_progress') {
          task['submission_path'] = null; // Clear visually if un-completing
      }
    });

    try {
      await _taskService.updateTaskWithSubmission(task['id'], newStatus, filePath: localFilePath);
      _fetchTasks(); // Refresh to get the right paths from server
    } catch (e) {
      // Revert if failed
      _fetchTasks();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(context, e))),
        );
      }
    }
  }

  Future<void> _openFile(String path) async {
    final url = Uri.parse('${AppConstants.storageUrl}/$path');
    try {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(context, e))),
        );
      }
    }
  }

  void _showTaskDetails(BuildContext context, Map<String, dynamic> task) {
    String? localSheetFilePath;
    final TextEditingController noteController = TextEditingController(text: task['submission_note'] ?? '');
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            final isCompleted = task['status'] == 'completed';
            final priorityColor = _getPriorityColor(task['priority'] ?? 'low');
            
            return Padding(
              padding: EdgeInsets.only(
            top: 24, left: 24, right: 24, 
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      task['title'] ?? 'Untitled Task',
                      style: GoogleFonts.notoSansKhmer(fontSize: 20, fontWeight: FontWeight.bold, decoration: isCompleted ? TextDecoration.lineThrough : null),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: priorityColor.withValues(alpha:0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      (task['priority'] ?? 'LOW').toUpperCase(),
                      style: GoogleFonts.notoSansKhmer(color: priorityColor, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (task['description'] != null && (task['description'] as String).isNotEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(12)),
                  child: Text(
                    task['description'],
                    style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[800]),
                  ),
                )
              else 
                Text('No additional description provided.', style: GoogleFonts.notoSansKhmer(fontSize: 14, fontStyle: FontStyle.italic, color: Colors.grey)),
              
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(LucideIcons.calendar, size: 16, color: Colors.blue[600]),
                  const SizedBox(width: 8),
                  Text(
                    'Due Date: ${task['due_date'] ?? 'No Due Date'}',
                    style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey[800], fontWeight: FontWeight.w500),
                  ),
                ],
              ),

              if (task['attachment_path'] != null || task['submission_path'] != null) ...[
                const SizedBox(height: 24),
                Text('Attachments', style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (task['attachment_path'] != null)
                  ListTile(
                    onTap: () => _openFile(task['attachment_path']),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.blue.shade100)),
                    tileColor: Colors.blue.shade50.withValues(alpha:0.5),
                    leading: const Icon(LucideIcons.paperclip, color: Colors.blue),
                    title: Text('Admin Instructions', style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.blue.shade700, fontWeight: FontWeight.w600)),
                    trailing: const Icon(LucideIcons.externalLink, size: 16, color: Colors.blue),
                  ),
                if (task['submission_path'] != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: ListTile(
                      onTap: () => _openFile(task['submission_path']),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.green.shade100)),
                      tileColor: Colors.green.shade50.withValues(alpha:0.5),
                      leading: const Icon(LucideIcons.image, color: Colors.green),
                      title: Text('Your Submission', style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.green.shade700, fontWeight: FontWeight.w600)),
                      trailing: const Icon(LucideIcons.externalLink, size: 16, color: Colors.green),
                    ),
                  ),
              ],
              
              if (task['submission_note'] != null && (task['submission_note'] as String).isNotEmpty) ...[
                const SizedBox(height: 16),
                Text('Submission Note', style: GoogleFonts.notoSansKhmer(fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.green.shade200)),
                  child: Text(
                    task['submission_note'],
                    style: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.green.shade800),
                  ),
                ),
              ],
              
              const SizedBox(height: 24),
              
              if (!isCompleted) ...[
                 TextField(
                   controller: noteController,
                   decoration: InputDecoration(
                     hintText: 'Add a note or remark (optional)',
                     hintStyle: GoogleFonts.notoSansKhmer(fontSize: 14, color: Colors.grey),
                     border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                     enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                     focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.blue)),
                     filled: true,
                     fillColor: Colors.white,
                   ),
                   maxLines: 2,
                 ),
                 const SizedBox(height: 16),
              ],

              if (localSheetFilePath == null)
                OutlinedButton.icon(
                  onPressed: () async {
                    final String? path = await _pickAttachment(context);
                    if (path != null) {
                      setModalState(() {
                        localSheetFilePath = path;
                      });
                    }
                  },
                  icon: const Icon(LucideIcons.upload),
                  label: Text(isCompleted ? 'Change Proof File' : 'Attach Photo or Video Proof'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),

              if (localSheetFilePath != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.green.shade200)),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.checkCircle2, color: Colors.green),
                      const SizedBox(width: 8),
                      Expanded(child: Text('Proof attached and ready to submit!', style: GoogleFonts.notoSansKhmer(color: Colors.green.shade700, fontSize: 13))),
                    ],
                  ),
                ),
              
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    if (!isCompleted || localSheetFilePath != null) {
                        if (localSheetFilePath != null) {
                            final messenger = ScaffoldMessenger.of(context);
                            setState(() { task['status'] = 'completed'; });
                            try {
                              await _taskService.updateTaskWithSubmission(task['id'], 'completed', filePath: localSheetFilePath, note: noteController.text);
                              _fetchTasks();
                            } catch (e) {
                              _fetchTasks();
                              if (mounted) messenger.showSnackBar(SnackBar(content: Text(friendlyError(this.context, e))));
                            }
                        } else if (!isCompleted) {
                            final messenger = ScaffoldMessenger.of(context);
                            setState(() { task['status'] = 'completed'; });
                            try {
                              await _taskService.updateTaskWithSubmission(task['id'], 'completed', note: noteController.text);
                              _fetchTasks();
                            } catch (e) {
                              _fetchTasks();
                              if (mounted) messenger.showSnackBar(SnackBar(content: Text(friendlyError(this.context, e))));
                            }
                        }
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: (isCompleted && localSheetFilePath == null) ? Colors.grey : Colors.blue,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    (isCompleted && localSheetFilePath == null) ? 'Completed' : 
                    (isCompleted && localSheetFilePath != null) ? 'Save New Proof' : 'Mark as Complete',
                    style: GoogleFonts.notoSansKhmer(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white),
                  ),
                ),
              )
            ],
          ),
        );
          }
        );
      }
    );
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high': return Colors.red;
      case 'medium': return Colors.orange;
      default: return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.myTasks, style: GoogleFonts.notoSansKhmer(fontWeight: FontWeight.w600)),
        centerTitle: true,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        foregroundColor: Colors.white,
      ),
      body: Skeletonizer(
        enabled: _loading,
        child: _error != null && !_loading
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(AppLocalizations.of(context)!.somethingWentWrong, style: GoogleFonts.notoSansKhmer(fontSize: 18, fontWeight: FontWeight.bold)),
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Text(_error!, textAlign: TextAlign.center, style: GoogleFonts.notoSansKhmer(color: Colors.grey)),
                      ),
                      ElevatedButton.icon(
                        onPressed: _fetchTasks,
                        icon: const Icon(Icons.refresh),
                        label: Text(AppLocalizations.of(context)!.retryConnection),
                      )
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchTasks,
                  child: (_tasks.isEmpty && !_loading)
                      ? ListView(
                          children: [
                            const SizedBox(height: 150),
                            Center(child: Column(
                              children: [
                                Icon(LucideIcons.clipboardCheck, size: 64, color: Colors.grey[300]),
                                const SizedBox(height: 16),
                                Text('All caught up!', style: GoogleFonts.notoSansKhmer(fontSize: 18, color: Colors.grey[600])),
                                Text('No tasks assigned to you.', style: GoogleFonts.notoSansKhmer(color: Colors.grey[400])),
                              ],
                            )),
                          ],
                        )
                      : ListView.builder(
                          itemCount: _loading ? 3 : _tasks.length,
                          padding: const EdgeInsets.all(16),
                          itemBuilder: (context, index) {
                            final task = _loading ? {
                              'title': 'Loading Task...',
                              'description': 'Loading description...',
                              'due_date': '2023-01-01',
                              'priority': 'medium',
                              'status': 'pending'
                            } : _tasks[index];
                            final isCompleted = task['status'] == 'completed';
                            final priorityColor = _getPriorityColor(task['priority'] ?? 'low');
                            
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              decoration: BoxDecoration(
                                color: isCompleted ? Colors.grey.shade50 : Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: isCompleted ? [] : [
                                  BoxShadow(color: Colors.black.withValues(alpha:0.05), blurRadius: 8, offset: const Offset(0, 2))
                                ],
                                border: isCompleted ? Border.all(color: Colors.grey.shade200) : null,
                              ),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () => _showTaskDetails(context, task),
                                  borderRadius: BorderRadius.circular(16),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Row(
                                      children: [
                                        // Custom Checkbox mapping to completion
                                        GestureDetector(
                                          onTap: () => _toggleStatus(task),
                                          child: AnimatedContainer(
                                            duration: const Duration(milliseconds: 200),
                                            width: 24,
                                            height: 24,
                                            decoration: BoxDecoration(
                                              color: isCompleted ? Colors.green : Colors.transparent,
                                              shape: BoxShape.circle,
                                              border: Border.all(
                                                color: isCompleted ? Colors.green : Colors.grey.shade400,
                                                width: 2,
                                              ),
                                            ),
                                            child: isCompleted 
                                                ? const Icon(Icons.check, size: 16, color: Colors.white)
                                                : null,
                                          ),
                                        ),
                                        const SizedBox(width: 16),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                task['title'] ?? 'Untitled',
                                                style: GoogleFonts.notoSansKhmer(
                                                  decoration: isCompleted ? TextDecoration.lineThrough : null,
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 16,
                                                  color: isCompleted ? Colors.grey : Colors.black87,
                                                ),
                                              ),
                                              if (task['description'] != null && (task['description'] as String).isNotEmpty)
                                                Padding(
                                                  padding: const EdgeInsets.only(top: 4),
                                                  child: Text(
                                                    task['description'], 
                                                    style: GoogleFonts.notoSansKhmer(fontSize: 12, color: Colors.grey[600]),
                                                    maxLines: 2,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              const SizedBox(height: 8),
                                              Row(
                                                children: [
                                                  Icon(LucideIcons.calendar, size: 12, color: Colors.blue[400]),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    task['due_date'] ?? 'No Due Date',
                                                    style: GoogleFonts.notoSansKhmer(fontSize: 11, color: Colors.blue[400], fontWeight: FontWeight.w500),
                                                  ),
                                                  const Spacer(),
                                                  if (task['attachment_path'] != null)
                                                      const Icon(LucideIcons.paperclip, size: 14, color: Colors.blue),
                                                  const SizedBox(width: 8),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: priorityColor.withValues(alpha:0.1),
                                                      borderRadius: BorderRadius.circular(12),
                                                    ),
                                                    child: Text(
                                                      (task['priority'] ?? 'LOW').toUpperCase(),
                                                      style: GoogleFonts.notoSansKhmer(
                                                        color: priorityColor,
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
      ),
    );
  }
}
