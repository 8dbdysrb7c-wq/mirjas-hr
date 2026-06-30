import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# The injection block was:
# {* GPS Multi-Locations Settings *}
# ...
# )}
#         

# Find the exact block that was injected.
# If I look at what happened, `block_to_replace` was empty.
# So `new_gps_block` was injected everywhere.
# Let's find `new_gps_block` exactly.
block_start_idx = content.find('{/* GPS Multi-Locations Settings */}')
block_end_idx = content.find(')}', block_start_idx) + 2

if block_start_idx != -1 and block_end_idx != -1:
    # Actually, the block ended with `          )}\n        `
    # Let's just find the first instance and its exact text.
    # To be safe, we'll extract exactly what is between the first char and the next char.
    # Wait, the first character of the original file is 'i' (from `import`).
    # If the block was inserted at the very beginning (before 'i'), then content starts with the block.
    if content.startswith('{/* GPS Multi-Locations Settings */}'):
        # the first char of original text follows the first block
        # Let's find the second instance of the block to determine the block exactly.
        idx2 = content.find('{/* GPS Multi-Locations Settings */}', 10)
        # The text between 0 and idx2 contains the block and EXACTLY ONE character of original text at the end of the block.
        # So the block is `content[:idx2 - 1]`
        new_gps_block = content[:idx2 - 1]
    else:
        # The block was inserted after the first character.
        # So the first character is `content[0]`, then the block starts at `content[1]`.
        idx1 = content.find('{/* GPS Multi-Locations Settings */}')
        idx2 = content.find('{/* GPS Multi-Locations Settings */}', idx1 + 10)
        # The block is `content[idx1:idx2-1]`
        new_gps_block = content[idx1:idx2-1]

    print("Found block of length:", len(new_gps_block))
    
    # Restore the original text by splitting and joining
    original_chars = content.split(new_gps_block)
    restored_text = "".join(original_chars)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(restored_text)
    print("Restored successfully.")
else:
    print("Block not found.")
