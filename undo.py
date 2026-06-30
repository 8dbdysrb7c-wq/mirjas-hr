import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

bad_start = '{activeTab === \'workshifts\' && (\n        <div className="flex flex-col xl:flex-row gap-6 animate-fade-in w-full">\n          <div className="w-full xl:w-1/2">'
if bad_start in content:
    content = content.replace(bad_start, '{activeTab === \'workshifts\' && (')
else:
    print('bad_start not found!')

bad_end = '              </table>\n            </div>\n          </div>\n          </div>\n          <div className="w-full xl:w-1/2 space-y-6">'
if bad_end in content:
    content = content.replace(bad_end, '              </table>\n            </div>\n          </div>\n        )}')
else:
    print('bad_end not found!')

bad_end_2 = '                </table>\n              </div>\n            </div>\n          </div>\n          <div className="w-full xl:w-1/2 space-y-6">'
if bad_end_2 in content:
    content = content.replace(bad_end_2, '                </table>\n              </div>\n            </div>\n          </div>\n        )}')

gps_content_start = '          <div className="space-y-6">\n            {/* GPS Multi-Locations Settings */}'
if gps_content_start in content:
    content = content.replace(gps_content_start, '{activeTab === \'gps\' && (\n' + gps_content_start)
else:
    print('gps_content_start not found!')

content = re.sub(r'<\/div><\/div>\)\}\s*\{activeTab === \'hr\' && \(', '{activeTab === \'hr\' && (', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Undo script finished.')
