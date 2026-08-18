import json

log_file = '/Users/mac/.gemini/antigravity-ide/brain/4709ce90-3f23-49fa-84fa-d88db6cbfdbc/.system_generated/logs/transcript_full.jsonl'
with open(log_file, 'r') as f:
    lines = f.readlines()

out = open('EmployeeList_diffs.txt', 'w')

for i in range(len(lines)):
    try:
        obj = json.loads(lines[i])
        if obj.get('type') == 'PLANNER_RESPONSE':
            tool_calls = obj.get('tool_calls', [])
            for call in tool_calls:
                if call['name'] in ['replace_file_content', 'multi_replace_file_content', 'default_api:replace_file_content', 'default_api:multi_replace_file_content']:
                    args = call['args']
                    if 'EmployeeList.tsx' in args.get('TargetFile', ''):
                        out.write(f"--- STEP {obj['step_index']} ---\n")
                        if 'ReplacementChunks' in args:
                            for c in args['ReplacementChunks']:
                                out.write("TARGET:\n" + c.get('TargetContent', '') + "\n")
                                out.write("REPLACEMENT:\n" + c.get('ReplacementContent', '') + "\n")
                        else:
                            out.write("TARGET:\n" + args.get('TargetContent', '') + "\n")
                            out.write("REPLACEMENT:\n" + args.get('ReplacementContent', '') + "\n")
                        out.write("\n======================\n")
    except Exception as e:
        pass

out.close()
