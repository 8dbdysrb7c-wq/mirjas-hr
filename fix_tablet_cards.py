
with open('src/pages/admin/AdminOverview.css', 'r', encoding='utf-8') as f:
    content = f.read()

# First, remove the old 1024px media query if it exists
import re
content = re.sub(r'@media \(max-width:\s*1024px\)\s*\{\s*\.overview-grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*1fr\);\s*\}\s*\.hr-requests-grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*1fr\);\s*\}\s*\}', '', content, flags=re.DOTALL)

# Now, we want to apply the same small square layout to tablets
# We already have:
# .preview-active.preview-phone {...}
# @media (max-width: 768px) {...}
# We should update these to include tablet preview and up to 1024px

new_css_body = '''
  .overview-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 12px !important; }
  .hr-requests-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 12px !important; }
  
  .stat-card {
    padding: 12px 6px !important;
    border-radius: 14px !important;
    position: relative;
    overflow: hidden;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    aspect-ratio: 1 / 1.05 !important;
  }
  
  .icon-wrapper { 
    width: 40px !important; 
    height: 40px !important; 
    margin-bottom: 8px !important; 
    border-radius: 12px !important; 
  }
  .icon-wrapper svg { width: 20px !important; height: 20px !important; }
  
  .stat-title { 
    font-size: 11px !important; 
    margin-bottom: 6px !important; 
    text-align: center; 
    line-height: 1.2 !important; 
    padding: 0; 
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    height: 26px;
  }
  
  .stat-number { 
    font-size: 18px !important; 
    margin-bottom: 0 !important; 
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: 100% !important;
    line-height: 1 !important;
  }
  
  .stat-number span {
    font-size: 12px !important;
  }

  .stat-pill { display: none !important; }
  
  .card-button { 
    position: absolute !important; 
    inset: 0 !important; 
    opacity: 0 !important; 
    z-index: 10 !important; 
    padding: 0 !important; 
    margin: 0 !important; 
    width: 100% !important; 
    height: 100% !important; 
  }
'''

# Find the start of our previous overrides
idx = content.find('/* --- Mobile Grid Fixes for Admin Overview --- */')
if idx != -1:
    content = content[:idx]

css_valid = f'''
/* --- Mobile Grid Fixes for Admin Overview --- */

/* For Preview Mode (Phone) */
.preview-active.preview-phone {{
{new_css_body.replace('aspect-ratio: 1 / 1.05 !important;', 'aspect-ratio: 1 / 1.1 !important;').replace('12px 6px', '8px 4px').replace('font-size: 11px', 'font-size: 9px').replace('height: 26px', 'height: 22px').replace('font-size: 18px', 'font-size: 14px').replace('gap: 12px', 'gap: 8px')}
}}

/* For Preview Mode (Tablet) */
.preview-active.preview-tablet {{
{new_css_body}
}}

/* For Real Mobile Devices */
@media (max-width: 768px) {{
{new_css_body.replace('aspect-ratio: 1 / 1.05 !important;', 'aspect-ratio: 1 / 1.1 !important;').replace('12px 6px', '8px 4px').replace('font-size: 11px', 'font-size: 9px').replace('height: 26px', 'height: 22px').replace('font-size: 18px', 'font-size: 14px').replace('gap: 12px', 'gap: 8px')}
}}

/* For Real Tablet Devices */
@media (min-width: 769px) and (max-width: 1024px) {{
{new_css_body}
}}
'''

with open('src/pages/admin/AdminOverview.css', 'w', encoding='utf-8') as f:
    f.write(content + css_valid)

print('Done!')

