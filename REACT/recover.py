import json

log_file = '/Users/mac/.gemini/antigravity-ide/brain/4709ce90-3f23-49fa-84fa-d88db6cbfdbc/.system_generated/logs/transcript_full.jsonl'
with open(log_file, 'r') as f:
    lines = f.readlines()

for i in range(len(lines)-1, -1, -1):
    try:
        obj = json.loads(lines[i])
        if obj.get('type') == 'TOOL_RESPONSE' and 'EmployeeList.tsx' in str(obj):
            content = obj.get('content', '')
            if 'The above content shows the entire, complete file contents' in content or 'Showing lines 1 to ' in content:
                print(f"Found view_file at step {obj.get('step_index')}")
                # We want to dump it
                with open('recovered_EmployeeList_output.txt', 'w') as out:
                    out.write(content)
                break
    except Exception as e:
        pass
