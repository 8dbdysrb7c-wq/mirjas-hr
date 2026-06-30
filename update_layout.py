import re
file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the missions tab button
btn_target = '<div className={`premium-tab ${activeTab === \'missions\' ? \'premium-tab-active\' : \'premium-tab-inactive\'}`} onClick={() => setActiveTab(\'missions\')}>\n          <Truck size={18} /> <span>إعدادات التوصيل</span>\n        </div>\n'
content = content.replace(btn_target, '')

# If there's a slight formatting difference, use regex
content = re.sub(r'<div className={`premium-tab \$\{activeTab === \'missions\'.*?</div>\s*', '', content, flags=re.DOTALL)


# 2. Remove the missions tab content
missions_content_start = content.find('{activeTab === \'missions\' && (')
if missions_content_start != -1:
    missions_content_end = content.find('{activeTab === \'whatsapp\' && (')
    if missions_content_end != -1:
        content = content[:missions_content_start] + content[missions_content_end:]


# 3. Move the "حالات حركة التوصيل" table outside the grid-cols-2 in statuses tab
statuses_start = content.find('{activeTab === \'statuses\' && (')
users_start = content.find('{activeTab === \'users\' && (')

statuses_block = content[statuses_start:users_start]

# The statuses block currently looks like:
# {activeTab === 'statuses' && (
#   <div className="grid grid-cols-2 gap-8">
#      ... tables ...
#      {/* حالات حركة التوصيل */}
#      <div className="glass-panel p-6 space-y-4"> ... </div>
#   </div>
# )}

# We want to extract the "حالات حركة التوصيل" div, and place it AFTER the grid, but still inside the main conditional.
# Let's find the table inside statuses_block
table_start = statuses_block.find('{/* حالات حركة التوصيل */}')
if table_start != -1:
    # Find where the table div ends. The div is `glass-panel`.
    # We can use the fact that the grid closes just after it.
    table_block = statuses_block[table_start:]
    
    # We want to separate the table block from the grid.
    # We know `table_block` ends with:
    #             </div>
    # </div>
    #           </div>
    #         )}
    
    # Actually, let's just do a string replacement.
    # In the current code, the grid div ends right after the table.
    # The current structure:
    #             </div> (closes glass-panel of table)
    # </div> (closes grid)
    #           </div> (closes animate-fade-in or whatever)
    #         )} (closes activeTab)
    
    # Let's replace the grid closing div to happen BEFORE the table.
    # table_html starts with `{/* حالات حركة التوصيل */}`
    
    # To be safe, we will just extract the table HTML.
    # The table HTML starts at table_start and goes until it closes.
    # `table_html` should have balanced divs.
    # It has 1 outer `glass-panel` div.
    div_count = 0
    i = table_start
    first_div = True
    table_end = table_start
    while i < len(statuses_block):
        if statuses_block.startswith('<div', i):
            div_count += 1
            first_div = False
        elif statuses_block.startswith('</div', i):
            div_count -= 1
            if not first_div and div_count == 0:
                # We found the closing div of glass-panel
                # Add 6 for '</div>'
                table_end = i + 6
                break
        i += 1

    extracted_table = statuses_block[table_start:table_end]
    
    # Now remove extracted_table from inside the grid
    new_statuses_block = statuses_block[:table_start] + statuses_block[table_end:]
    
    # Now `new_statuses_block` has `</div>` that closes the grid, and `</div>` that closes the main wrapper.
    # Let's find the closing of the grid in new_statuses_block.
    # It's probably `</div>\n          </div>\n        )}`
    
    # Let's just insert the extracted_table AFTER the grid `</div>`
    # We will find the last `</div>` before the `)}`
    # Actually, the grid is wrapped in an `animate-fade-in` div?
    # Let's see: `{activeTab === 'statuses' && (\n          <div className="grid grid-cols-2 gap-8">`
    # No, it's NOT wrapped in an `animate-fade-in` div!
    # `activeTab === 'statuses'` directly returns the `<div className="grid grid-cols-2 gap-8">`.
    # Wait, if `activeTab === 'statuses'` returns the grid directly, we can't put a div after the grid without wrapping BOTH in a Fragment or a parent div!
    # Ah! React requires a single parent element.
    # So we MUST wrap the grid and the table in a parent div.
    
    # Let's rewrite the statuses block completely to be safe.
    
    # Extract the original grid content (everything after the grid start to before table_start)
    grid_start = statuses_block.find('<div className="grid grid-cols-2 gap-8">')
    if grid_start != -1:
        grid_inner = statuses_block[grid_start + len('<div className="grid grid-cols-2 gap-8">') : table_start]
        
        # Build the new statuses block
        reconstructed_block = "{activeTab === 'statuses' && (\n"
        reconstructed_block += "          <div className=\"space-y-8 animate-fade-in\">\n"
        reconstructed_block += "            <div className=\"grid grid-cols-2 gap-8\">\n"
        reconstructed_block += grid_inner
        reconstructed_block += "            </div>\n"
        reconstructed_block += "            <div className=\"w-full\">\n"
        reconstructed_block += "              " + extracted_table + "\n"
        reconstructed_block += "            </div>\n"
        reconstructed_block += "          </div>\n"
        reconstructed_block += "        )}\n"
        
        content = content[:statuses_start] + reconstructed_block + content[users_start:]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Successfully updated layout for statuses tab and removed missions tab.')
    else:
        print('Grid not found in statuses block.')
else:
    print('Table not found in statuses block.')
