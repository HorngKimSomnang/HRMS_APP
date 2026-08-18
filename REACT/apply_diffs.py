import re

with open('EmployeeList_diffs.txt', 'r') as f:
    diff_content = f.read()

# Parse the diffs
chunks = diff_content.split('======================')
replacements = []

for chunk in chunks:
    if 'TARGET:\n' in chunk and 'REPLACEMENT:\n' in chunk:
        target_parts = chunk.split('TARGET:\n')
        for part in target_parts[1:]:
            if 'REPLACEMENT:\n' in part:
                target_text = part.split('REPLACEMENT:\n')[0].strip('\n')
                replacement_text = part.split('REPLACEMENT:\n')[1].strip('\n')
                
                # We need to strip the last newline before "--- STEP" if present
                if '\n--- STEP' in replacement_text:
                    replacement_text = replacement_text.split('\n--- STEP')[0]
                
                replacements.append((target_text, replacement_text))

with open('src/pages/employees/EmployeeList.tsx', 'r') as f:
    content = f.read()

success_count = 0
for target, replacement in replacements:
    # Try exact match first
    if target in content:
        content = content.replace(target, replacement)
        success_count += 1
    else:
        print("FAILED TO FIND TARGET:")
        print(repr(target[:100]))

print(f"Applied {success_count}/{len(replacements)} replacements.")

with open('src/pages/employees/EmployeeList.tsx', 'w') as f:
    f.write(content)
