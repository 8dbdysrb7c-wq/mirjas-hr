import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def extract_block(content, start_str):
    start_idx = content.find(start_str)
    if start_idx == -1:
        return None, None, None
        
    brace_count = 0
    in_string = False
    string_char = ''
    i = start_idx + len(start_str) - 1 # starts at the '('
    
    while i < len(content):
        c = content[i]
        
        if in_string:
            if c == string_char and content[i-1] != '\\':
                in_string = False
        else:
            if c in ["'", '"', "`"]:
                in_string = True
                string_char = c
            elif c == '(':
                brace_count += 1
            elif c == ')':
                brace_count -= 1
                if brace_count == 0:
                    # found the end!
                    return start_idx, i + 1, content[start_idx:i+1]
        i += 1
        
    return None, None, None

# Find workshifts block
ws_start, ws_end, ws_block = extract_block(content, "{activeTab === 'workshifts' && (")
if not ws_block:
    print("Could not extract workshifts block")
    sys.exit(1)

# Find gps block
gps_start, gps_end, gps_block = extract_block(content, "{activeTab === 'gps' && (")
if not gps_block:
    print("Could not extract gps block")
    sys.exit(1)

# Ensure ws_block and gps_block are valid
print("Extracted ws_block length:", len(ws_block))
print("Extracted gps_block length:", len(gps_block))

# Extract the inner contents (without the `{activeTab === ... && (` and the trailing `)}`)
ws_inner = ws_block[len("{activeTab === 'workshifts' && ("):-2].strip()
gps_inner = gps_block[len("{activeTab === 'gps' && ("):-2].strip()

# Create the combined block
combined_block = f"""{{activeTab === 'workshifts' && (
  <div className="flex flex-col lg:flex-row gap-6 animate-fade-in w-full">
    <div className="w-full lg:w-1/2">
      {ws_inner}
    </div>
    <div className="w-full lg:w-1/2">
      {gps_inner}
    </div>
  </div>
)}}"""

# Replace the original blocks in the content
# We have to be careful about indices shifting.
# Let's replace the one that comes later first so indices of the earlier one don't shift.
if gps_start > ws_start:
    content = content[:gps_start] + content[gps_end:]
    content = content[:ws_start] + combined_block + content[ws_end:]
else:
    content = content[:ws_start] + content[ws_end:]
    content = content[:gps_start] + combined_block + content[gps_end:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminSettings.jsx layout rebuilt successfully.")
