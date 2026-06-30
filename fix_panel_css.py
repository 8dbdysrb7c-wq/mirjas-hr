
with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

old_css = '''  .notification-panel {
      position: fixed;
      top: max(0.75rem, env(safe-area-inset-top, 0px));
      left: 0.75rem;
      right: 0.75rem;
      bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
      width: auto;
      max-height: none;
      border-radius: 24px;
      transform: none !important;
      z-index: 14000;
      display: flex;
      flex-direction: column;
    }'''

new_css = '''  .notification-panel {
      position: fixed !important;
      top: max(0.75rem, env(safe-area-inset-top, 0px)) !important;
      left: -1rem !important; /* Offset parent padding */
      width: calc(100vw - 1rem) !important;
      bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px)) !important;
      max-height: none !important;
      border-radius: 24px !important;
      transform: none !important;
      z-index: 14000 !important;
      display: flex !important;
      flex-direction: column !important;
    }'''

if old_css in css:
    css = css.replace(old_css, new_css)
    with open('src/index.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print('Replaced')
else:
    print('Not found')

