
with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

import re

css = re.sub(
    r'\s*\.notification-panel \{\s*position: fixed !important;\s*top: max\(0\.75rem,\s*env\(safe-area-inset-top,\s*0px\)\) !important;\s*left: -0\.5rem !important;\s*right: -0\.5rem !important;\s*width: calc\(100vw - 1rem\) !important;\s*bottom: calc\(0\.75rem \+ env\(safe-area-inset-bottom,\s*0px\)\) !important;\s*max-height: none !important;\s*border-radius: 24px !important;\s*transform: none !important;\s*z-index: 14000 !important;\s*display: flex !important;\s*flex-direction: column !important;\s*\}',
    '''  .notification-panel {
      position: fixed !important;
      top: max(0.75rem, env(safe-area-inset-top, 0px)) !important;
      left: -1rem !important;
      right: -1rem !important;
      width: 100vw !important;
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
print('Fixed width again')

