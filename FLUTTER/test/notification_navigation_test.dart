import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_mobile/core/notification_navigation.dart';

void main() {
  test('routes employee HR notifications to their feature screens', () {
    expect(notificationRouteForPayload({'type': 'leave_status'}), '/leaves');
    expect(
      notificationRouteForPayload({'type': 'overtime_status'}),
      '/overtime',
    );
    expect(
      notificationRouteForPayload({'type': 'payslip_generated'}),
      '/payslips',
    );
    expect(
      notificationRouteForPayload({'type': 'clock_out_reminder'}),
      '/attendance',
    );
  });

  test('routes a custom entity reply to the matching employee form', () {
    expect(
      notificationRouteForPayload({
        'type': 'custom_entity_record_replied',
        'entity_slug': 'monthly-sales',
        'record_id': 42,
      }),
      '/my-forms/monthly-sales?record=42',
    );
  });

  test('does not open an unsupported admin web route', () {
    expect(notificationRouteForPayload({'action_url': '/reports'}), isNull);
  });
}
