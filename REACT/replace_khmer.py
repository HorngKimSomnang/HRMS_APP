import re
import glob

files = glob.glob('REACT/src/pages/employees/*.tsx')

# We want to replace patterns like:
# "Profile Picture / រូបថតប្រវត្តិរូប" -> "Profile Picture"
# But keep: "{isSelf && "(Read-only for your own profile)"}"

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex logic: Match the English text, followed by " / ", followed by Khmer text, optionally followed by curly braces
    # Actually, let's just do a blanket regex: replace " / [Khmer Characters]+" with ""
    # Khmer unicode block is \u1780-\u17FF
    
    # Let's match " / " followed by one or more characters that are not '<' or '{'
    new_content = re.sub(r' \/ [^\<\{]+', '', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("Replaced in files")
