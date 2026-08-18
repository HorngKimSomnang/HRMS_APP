import os
import re

def process():
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                
                new_content = content
                
                # We want to replace `user?.roles?.some(...)` with `user?.role?.is_super_admin` or `user?.role?.name === '...'`
                new_content = re.sub(r"user\?\.roles\?\.some\(\([^)]+\)\s*=>\s*[^)]+name\s*===\s*'Super Admin'\)", "user?.role?.name === 'Super Admin'", new_content)
                new_content = re.sub(r"user\?\.roles\?\.some\([^)]+=>\s*[^)]+is_super_admin\)", "user?.role?.is_super_admin", new_content)
                new_content = re.sub(r"user\.roles\?\.some\(\([^)]+\)\s*=>\s*[^)]+name\s*===\s*'Super Admin'\)", "user?.role?.name === 'Super Admin'", new_content)
                new_content = re.sub(r"user\.roles\?\.some\([^)]+=>\s*[^)]+is_super_admin\)", "user?.role?.is_super_admin", new_content)
                
                new_content = re.sub(r"fetchedUser\.roles\?\.some\([^)]+=>\s*[^)]+is_super_admin\)", "fetchedUser.role?.is_super_admin", new_content)
                
                if new_content != content:
                    with open(filepath, 'w') as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")

process()
