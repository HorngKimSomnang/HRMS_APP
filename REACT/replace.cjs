const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    // We want to replace user?.roles?.some((r: any) => r?.is_super_admin) with user?.role?.is_super_admin
    // We also want to replace user?.roles?.some((r: any) => r.is_super_admin)
    // We also want to replace user?.roles?.some((role: any) => role.is_super_admin)
    let newContent = content.replace(/user\?\.roles\?\.some\([^)]*is_super_admin\)/g, 'user?.role?.is_super_admin');
    
    // AuthContext has fetchedUser.roles?.some
    newContent = newContent.replace(/fetchedUser\.roles\?\.some\([^)]*is_super_admin\)/g, 'fetchedUser.role?.is_super_admin');
    
    // AuthContext has user.roles?.some
    newContent = newContent.replace(/user\.roles\?\.some\([^)]*is_super_admin\)/g, 'user?.role?.is_super_admin');
    
    // Login.tsx has user.roles?.some((r: any) => r.name === 'Super Admin')
    newContent = newContent.replace(/user\.roles\?\.some\([^)]*name === 'Super Admin'\)/g, 'user?.role?.name === \'Super Admin\'');
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated', filePath);
    }
  }
});
