import os
import re

def process_file(path):
    with open(path, 'r') as f:
        content = f.read()

    # We want to replace:
    # _apiService.client.get(...) -> ApiService.instance.cachedGet(...)
    # ApiService().client.get(...) -> ApiService.instance.cachedGet(...)
    
    new_content = re.sub(r'(_apiService|ApiService\(\))\.client\.get\(', 'ApiService.instance.cachedGet(', content)
    
    if new_content != content:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Updated {path}")

for root, dirs, files in os.walk('/Users/mac/Downloads/HR_Application-master/FLUTTER/lib'):
    for file in files:
        if file.endswith('.dart'):
            process_file(os.path.join(root, file))
