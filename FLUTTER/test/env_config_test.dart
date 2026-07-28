import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_mobile/core/env_config.dart';

void main() {
  test('uses the DigitalOcean production API by default', () {
    expect(EnvConfig.baseUrl, 'https://hr-application.duckdns.org/api');
    expect(EnvConfig.storageUrl, 'https://hr-application.duckdns.org/api/file');
  });
}
