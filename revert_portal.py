with open('src/components/NotificationCenter.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { createPortal } from \'react-dom\';\n', '')
content = content.replace('const panelRef = useRef(null);\n  const containerRef = useRef(null);', 'const panelRef = useRef(null);')

old_click = '''    const handleClickOutside = (event) => {
      const clickedInsidePanel = panelRef.current && panelRef.current.contains(event.target);
      const clickedInsideContainer = containerRef.current && containerRef.current.contains(event.target);
      
      if (!clickedInsidePanel && !clickedInsideContainer) {
        setIsOpen(false);
        setIsComposerOpen(false);
      }
    };'''

new_click = '''    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsComposerOpen(false);
      }
    };'''

if old_click in content:
    content = content.replace(old_click, new_click)

content = content.replace('<div className="notification-center" ref={containerRef}>', '<div className="notification-center" ref={panelRef}>')

old_panel = '''      {isOpen && createPortal(
        <div className="notification-panel animate-fade-in" ref={panelRef}>'''
new_panel = '''      {isOpen && (
        <div className="notification-panel animate-fade-in">'''

if old_panel in content:
    content = content.replace(old_panel, new_panel)

old_end = '''        </div>,
        document.body
      )}'''
new_end = '''        </div>
      )}'''

if old_end in content:
    content = content.replace(old_end, new_end)


with open('src/components/NotificationCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Portal Fix Reverted')
