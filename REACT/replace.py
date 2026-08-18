import os

def walk_and_replace(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                
                new_content = content
                
                # Replace exact strings ONLY for the authenticated user object
                replacements = {
                    "user?.roles?.some((r: any) => r?.is_super_admin)": "user?.role?.is_super_admin",
                    "user?.roles?.some((r: any) => r.is_super_admin)": "user?.role?.is_super_admin",
                    "user?.roles?.some((role: any) => role?.is_super_admin)": "user?.role?.is_super_admin",
                    "user?.roles?.some((role: any) => role.is_super_admin)": "user?.role?.is_super_admin",
                    
                    "user.roles?.some((r: any) => r?.is_super_admin)": "user?.role?.is_super_admin",
                    "user.roles?.some((r: any) => r.is_super_admin)": "user?.role?.is_super_admin",
                    "user.roles?.some((role: any) => role?.is_super_admin)": "user?.role?.is_super_admin",
                    "user.roles?.some((role: any) => role.is_super_admin)": "user?.role?.is_super_admin",
                    
                    "fetchedUser.roles?.some((r: any) => r.is_super_admin)": "fetchedUser.role?.is_super_admin",
                    
                    "user.roles?.some((r: any) => r.name === 'Super Admin')": "user.role?.name === 'Super Admin'"
                }
                
                for old_str, new_str in replacements.items():
                    new_content = new_content.replace(old_str, new_str)
                
                if new_content != content:
                    with open(filepath, 'w') as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")

walk_and_replace('src')
