import os, re
directory = r'd:\HRMS\REACT\src'
def replace_alert_with_toast(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove local const toast
    content = re.sub(r'const\s+toast\s*=\s*\{\s*success:\s*\(msg:\s*string\)\s*=>\s*alert\(msg\),\s*error:\s*\(msg:\s*string\)\s*=>\s*alert\(msg\)\s*};\s*', '', content)
    
    has_alert = 'alert(' in content
    has_toast = 'toast.' in content
    
    if (has_alert or has_toast) and 'from \'sonner\'' not in content and 'from "sonner"' not in content:
        imports = re.findall(r'^import .*?;?$', content, re.MULTILINE)
        if imports:
            last_import = imports[-1]
            content = content.replace(last_import, last_import + '\nimport { toast } from \'sonner\';', 1)
        else:
            content = 'import { toast } from \'sonner\';\n' + content
            
    def replacer(match):
        msg = match.group(1)
        if re.search(r'fail|error|invalid|required', msg, re.IGNORECASE):
            return f'toast.error({msg})'
        elif re.search(r'success|created|updated|deleted|approved|refunded|sent', msg, re.IGNORECASE):
            return f'toast.success({msg})'
        else:
            return f'toast({msg})'
            
    content = re.sub(r'alert\((.*?)\)', replacer, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                c = f.read()
            if 'alert(' in c or 'const toast =' in c:
                replace_alert_with_toast(file_path)
                print(f'Updated {file_path}')
