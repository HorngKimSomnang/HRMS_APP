import os
import re

def process_file(path):
    with open(path, 'r') as f:
        content = f.read()

    # Find service methods like: Future<List<dynamic>> getOvertimes() async {
    # and add forceRefresh parameter, then pass it to cachedGet
    
    # 1. Add forceRefresh to service method signatures
    content = re.sub(r'(Future<.*?> \w+\()(\))', r'\1{bool forceRefresh = false}\2', content)
    
    # 2. Pass forceRefresh to cachedGet
    content = re.sub(r'(ApiService\.instance\.cachedGet\([^)]+)\)', r'\1, forceRefresh: forceRefresh)', content)
    
    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('/Users/mac/Downloads/HR_Application-master/FLUTTER/lib/services'):
    for file in files:
        if file.endswith('_service.dart') and file != 'api_service.dart' and file != 'data_cache_service.dart' and file != 'live_version_service.dart':
            process_file(os.path.join(root, file))
