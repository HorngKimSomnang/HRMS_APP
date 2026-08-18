import os
import time

history_dir = os.path.expanduser('~/Library/Application Support/Code/User/History')

found_files = []

for root, dirs, files in os.walk(history_dir):
    for file in files:
        if file != 'entries.json':
            filepath = os.path.join(root, file)
            try:
                # Read first few lines to see if it's EmployeeList.tsx
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'export default function EmployeeList()' in content or 'EmployeeList' in content and 'react' in content:
                        mtime = os.path.getmtime(filepath)
                        found_files.append((mtime, filepath, len(content)))
            except Exception:
                pass

found_files.sort(reverse=True)

for mtime, filepath, length in found_files[:10]:
    print(f"Time: {time.ctime(mtime)}, Size: {length}, Path: {filepath}")

