String? notificationRouteForPayload(Map<String, dynamic> payload) {
  final type = payload['type']?.toString();

  switch (type) {
    case 'clock_out_reminder':
    case 'attendance':
      return '/attendance';
    case 'leave_request':
    case 'leave_status':
      return '/leaves';
    case 'overtime_status':
      return '/overtime';
    case 'payslip_generated':
    case 'payslip_status':
      return '/payslips';
    case 'task_assigned':
    case 'task_completed':
      return '/tasks';
    case 'document_uploaded':
      return '/documents';
    case 'announcement':
    case 'holiday':
      return '/holidays';
    case 'contract_expiring':
      return '/my-contract';
    case 'custom_entity_record_replied':
    case 'custom_entity_record_submitted':
      final slug = payload['entity_slug']?.toString();
      if (slug == null || slug.isEmpty) return '/my-forms';
      final recordId = payload['record_id']?.toString();
      return recordId == null || recordId.isEmpty
          ? '/my-forms/$slug'
          : '/my-forms/$slug?record=$recordId';
  }

  final actionUrl = payload['action_url']?.toString();
  const employeeRoutes = {
    '/attendance',
    '/leaves',
    '/overtime',
    '/payslips',
    '/tasks',
    '/documents',
    '/holidays',
    '/my-contract',
    '/my-forms',
  };

  return employeeRoutes.contains(actionUrl) ? actionUrl : null;
}
