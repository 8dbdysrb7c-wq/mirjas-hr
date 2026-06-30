
with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

import re

css = re.sub(
    r'\.notification-panel \{\s*position: fixed;\s*top: max\(0\.75rem,\s*env\(safe-area-inset-top,\s*0px\)\);\s*left: 0\.75rem;\s*right: 0\.75rem;\s*bottom: calc\(0\.75rem \+ env\(safe-area-inset-bottom,\s*0px\)\);\s*width: auto;\s*max-height: none;\s*border-radius: 24px;\s*transform: none !important;\s*z-index: 14000;\s*display: flex;\s*flex-direction: column;\s*\}',
    '''  .notification-panel {
      position: fixed !important;
      top: max(0.75rem, env(safe-area-inset-top, 0px)) !important;
      left: -0.5rem !important;
      right: -0.5rem !important;
      width: calc(100vw - 1rem) !important;
      bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px)) !important;
      max-height: none !important;
      border-radius: 24px !important;
      transform: none !important;
      z-index: 14000 !important;
      display: flex !important;
      flex-direction: column !important;
    }''',
    css
)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Done')

