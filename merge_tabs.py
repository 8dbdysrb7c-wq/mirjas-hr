import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Rename 'workshifts' tab button text
content = content.replace(
    "<Clock size={18} /> <span>فترات الدوام</span>",
    "<Clock size={18} /> <span>فترات الدوام وموقع البصمة</span>"
)

# 2. Remove 'gps' tab button
gps_tab_pattern = r'<div className=\{`premium-tab \$\{activeTab === \'gps\' \? \'premium-tab-active\' \: \'premium-tab-inactive\'\}`\} onClick=\{\(\) => setActiveTab\(\'gps\'\)\}>\n\s*<Globe size=\{18\} \/> <span>.*?<\/span>\n\s*<\/div>'
content = re.sub(gps_tab_pattern, "", content)

# 3. Restructure the render sections to be side by side
# Right now we have:
# {activeTab === 'workshifts' && (
#   <div className="glass-panel p-6 space-y-4 animate-fade-in">
# ...
# )}
# And:
# {activeTab === 'gps' && (
#   <div className="space-y-6">
# ...
# )}

# Let's extract the inside of the workshifts render block
workshifts_start = content.find("{activeTab === 'workshifts' && (")
if workshifts_start != -1:
    # Find matching closing bracket for the component
    # Actually, workshifts is just a single div right now: <div className="glass-panel p-6 space-y-4 animate-fade-in"> ... </div>
    pass

# A simpler way: 
# Replace {activeTab === 'workshifts' && ( with:
# {activeTab === 'workshifts' && (
#   <div className="flex flex-col xl:flex-row gap-6 animate-fade-in w-full">
#     <div className="w-full xl:w-1/2">
content = content.replace(
    "{activeTab === 'workshifts' && (",
    "{activeTab === 'workshifts' && (\n        <div className=\"flex flex-col xl:flex-row gap-6 animate-fade-in w-full\">\n          <div className=\"w-full xl:w-1/2\">"
)

# Replace the closing of workshifts with closing the 1/2 column and opening the next 1/2 column
# Wait, finding the closing of workshifts is hard using pure string replacement.
# Instead, let's find the exact string that ends workshifts.
# workshifts ends with:
#               </table>
#             </div>
#           </div>
#         )}
# We can replace that specific ending block.
workshifts_end_str = """                </table>
              </div>
            </div>
          </div>
        )}"""
if workshifts_end_str in content:
     content = content.replace(
         workshifts_end_str,
         """                </table>
              </div>
            </div>
          </div>
          <div className="w-full xl:w-1/2 space-y-6">"""
     )
else:
     # try slightly different formatting
     workshifts_end_str_alt = """              </table>
            </div>
          </div>
        )}"""
     if workshifts_end_str_alt in content:
          content = content.replace(
              workshifts_end_str_alt,
              """              </table>
            </div>
          </div>
          </div>
          <div className="w-full xl:w-1/2 space-y-6">"""
          )

# Now, we need to remove "{activeTab === 'gps' && (" and just let its content flow into the new xl:w-1/2 div
content = content.replace(
    "{activeTab === 'gps' && (",
    ""
)

# And we need to close the main flex container at the end of the gps block.
# gps block originally ended with:
#           </div>
#         )}
# But since we removed "{activeTab === 'gps' && (", we need to keep the ")} " but also close the </div> of the flex container!
# Wait, gps block ends with:
#                     </tbody>
#                   </table>
#                 </div>
#               </div>
#             </div>
#           </div>
#         )}
# Since we stripped the {activeTab === 'gps' && (, the closing `)}` will be a syntax error because there's no matching `(`.
# Let's replace the `)}` at the end of gps block with `</div></div>)}`.
# We can do this safely using regex or find.
# Actually, the easiest way to find the end of gps block is to look for the next `{activeTab ===`.
# The next one after gps is `{activeTab === 'hr' && (`.
# So we can replace the text right before `{activeTab === 'hr' && (`.

# Let's do a more robust regex replacement for the gps end.
gps_end_pattern = r'(\s*)<\/div>\s*\)\}'
# wait, there are multiple ")}". We only want the one before {activeTab === 'hr'
# Let's split content by `{activeTab === 'hr' && (`
parts = content.split("{activeTab === 'hr' && (")
if len(parts) == 2:
    # replace the last `)}` in parts[0] with `</div></div>)}`
    last_brace_idx = parts[0].rfind(")}")
    if last_brace_idx != -1:
        parts[0] = parts[0][:last_brace_idx] + "</div></div>)}" + parts[0][last_brace_idx+2:]
    content = parts[0] + "{activeTab === 'hr' && (" + parts[1]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AdminSettings.jsx successfully")
