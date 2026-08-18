import os
import re

def fix_auth_context():
    path = 'REACT/src/context/AuthContext.tsx'
    with open(path, 'r') as f:
        content = f.read()

    if 'hasPermission' not in content:
        # Add to interface
        content = content.replace('updateUser: (user: User) => void;', 'updateUser: (user: User) => void;\n    hasPermission: (permission: string) => boolean;')
        
        # Add implementation
        has_perm_impl = """
    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.roles?.some((r: any) => r.is_super_admin || r.name === 'Super Admin')) return true;
        const perms = (user as any).permissions || (user as any).direct_permissions || [];
        return perms.some((p: any) => {
            const pName = typeof p === 'string' ? p : p.name;
            return pName === permission;
        });
    };
"""
        content = content.replace('const updateUser = (newUser: User) => {', has_perm_impl + '\n    const updateUser = (newUser: User) => {')
        
        # Add to context provider
        content = content.replace('updateUser, isAuthenticated', 'updateUser, hasPermission, isAuthenticated')
        
        with open(path, 'w') as f:
            f.write(content)
        print("Fixed AuthContext.tsx")

def fix_files():
    for root, dirs, files in os.walk('REACT/src'):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                
                new_content = content
                
                # Replace user?.role?.name === '...'
                new_content = re.sub(r"user\?\.role\?\.name\s*===\s*'([^']+)'", r"user?.roles?.some((r: any) => r.name === '\1')", new_content)
                new_content = re.sub(r"user\?\.role\?\.name\s*!==\s*'([^']+)'", r"!user?.roles?.some((r: any) => r.name === '\1')", new_content)
                
                # Replace ['...', '...'].includes(user?.role?.name || '')
                new_content = re.sub(r"\['([^']+)',\s*'([^']+)'\]\.includes\(user\?\.role\?\.name\s*\|\|\s*''\)", r"user?.roles?.some((r: any) => r.name === '\1' || r.name === '\2')", new_content)
                new_content = re.sub(r"\['([^']+)',\s*'([^']+)'\]\.includes\(fetchedUser\.role\?\.name\s*\|\|\s*''\)", r"fetchedUser?.roles?.some((r: any) => r.name === '\1' || r.name === '\2')", new_content)
                new_content = re.sub(r"\['([^']+)',\s*'([^']+)'\]\.includes\(user\.role\?\.name\s*\|\|\s*''\)", r"user?.roles?.some((r: any) => r.name === '\1' || r.name === '\2')", new_content)
                
                # Replace user?.role?.is_super_admin
                new_content = re.sub(r"user\?\.role\?\.is_super_admin", r"user?.roles?.some((r: any) => r.is_super_admin)", new_content)
                
                # Fix NoticeBoardProps in DashboardMain
                if 'DashboardMain.tsx' in path:
                    new_content = new_content.replace('month={selectedMonth}', '')
                    new_content = new_content.replace('year={selectedYear}', '')
                    
                # Fix React is declared but its value is never read
                if 'CreatableSelect.tsx' in path:
                    new_content = new_content.replace('import React, ', 'import ')
                
                if new_content != content:
                    with open(path, 'w') as f:
                        f.write(new_content)
                    print(f"Fixed {path}")

fix_auth_context()
fix_files()
