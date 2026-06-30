import re

with open('src/components/NotificationCenter.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Import createPortal
if 'createPortal' not in content:
    content = content.replace('import React, { useEffect, useMemo, useRef, useState } from \'react\';', 'import React, { useEffect, useMemo, useRef, useState } from \'react\';\nimport { createPortal } from \'react-dom\';')

# Add containerRef
if 'const containerRef = useRef(null);' not in content:
    content = content.replace('const panelRef = useRef(null);', 'const panelRef = useRef(null);\n  const containerRef = useRef(null);')

# Update handleClickOutside
old_click = '''    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsComposerOpen(false);
      }
    };'''

new_click = '''    const handleClickOutside = (event) => {
      const clickedInsidePanel = panelRef.current && panelRef.current.contains(event.target);
      const clickedInsideContainer = containerRef.current && containerRef.current.contains(event.target);
      
      if (!clickedInsidePanel && !clickedInsideContainer) {
        setIsOpen(false);
        setIsComposerOpen(false);
      }
    };'''

if old_click in content:
    content = content.replace(old_click, new_click)

# Update the main return block
content = content.replace('<div className="notification-center" ref={panelRef}>', '<div className="notification-center" ref={containerRef}>')

old_panel = '''      {isOpen && (
        <div className="notification-panel animate-fade-in">'''
new_panel = '''      {isOpen && createPortal(
        <div className="notification-panel animate-fade-in" ref={panelRef}>'''

if old_panel in content:
    content = content.replace(old_panel, new_panel)

# find the end of the panel and add the portal closing
# we know the end of the panel is `        </div>\n      )}`
old_end = '''        </div>
      )}'''
new_end = '''        </div>,
        document.body
      )}'''

if old_end in content:
    content = content.replace(old_end, new_end)


with open('src/components/NotificationCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Portal Fix Applied')
