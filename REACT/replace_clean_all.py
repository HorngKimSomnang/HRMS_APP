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
                
                # Replace variations of `user?.roles?.some(...)` that check names or IDs
                replacements = [
                    (r"user\?\.roles\?\.some\([^)]+=>\s*[^)]+name\s*===\s*'Super Admin'\s*\|\|\s*[^)]+name\s*===\s*'Admin'\)", "['Super Admin', 'Admin'].includes(user?.role?.name || '')"),
                    (r"user\?\.roles\?\.some\(\(r:\s*any\)\s*=>\s*r\.name\s*===\s*'Super Admin'\s*\|\|\s*r\.name\s*===\s*'Admin'\)", "['Super Admin', 'Admin'].includes(user?.role?.name || '')"),
                    (r"fetchedUser\.roles\?\.some\([^)]+=>\s*\['Admin',\s*'Super Admin'\]\.includes\([^)]+name\)\)", "['Admin', 'Super Admin'].includes(fetchedUser.role?.name || '')"),
                    (r"user\?\.roles\?\.some\([^)]+=>\s*[^)]+name\s*===\s*'Super Admin'\)", "user?.role?.name === 'Super Admin'"),
                    (r"user\?\.roles\?\.some\([^)]+=>\s*[^)]+name\s*===\s*'Admin'\)", "user?.role?.name === 'Admin'"),
                    (r"user\.roles\?\.some\([^)]+=>\s*\['Admin',\s*'Super Admin'\]\.includes\([^)]+name\)\)", "['Admin', 'Super Admin'].includes(user.role?.name || '')"),
                    (r"user\?\.roles\?\.some\([^)]+=>\s*[^)]+name\s*!==\s*'Employee'\)", "user?.role?.name !== 'Employee'")
                ]
                
                for pattern, replacement in replacements:
                    new_content = re.sub(pattern, replacement, new_content)
                
                if new_content != content:
                    with open(filepath, 'w') as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")

process()
