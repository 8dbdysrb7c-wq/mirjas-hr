
with open('src/pages/admin/AdminOverview.css', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('/* --- Mobile Grid Fixes for Admin Overview --- */')
if idx != -1:
    content = content[:idx]

css_body = '''
  .overview-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
  .hr-requests-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
  
  .stat-card {
    padding: 8px 4px !important;
    border-radius: 12px !important;
    position: relative;
    overflow: hidden;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    aspect-ratio: 1 / 1.1 !important;
  }
  
  .icon-wrapper { 
    width: 32px !important; 
    height: 32px !important; 
    margin-bottom: 6px !important; 
    border-radius: 10px !important; 
  }
  .icon-wrapper svg { width: 16px !important; height: 16px !important; }
  
  .stat-title { 
    font-size: 9px !important; 
    margin-bottom: 4px !important; 
    text-align: center; 
    line-height: 1.2 !important; 
    padding: 0; 
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    height: 22px;
  }
  
  .stat-number { 
    font-size: 14px !important; 
    margin-bottom: 0 !important; 
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: 100% !important;
    line-height: 1 !important;
  }
  
  .stat-number span {
    font-size: 10px !important;
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

css_valid = f'''
/* --- Mobile Grid Fixes for Admin Overview --- */

/* For Preview Mode */
.preview-active.preview-phone {{
{css_body}
}}

/* For Real Mobile Devices */
@media (max-width: 768px) {{
{css_body}
}}
'''

with open('src/pages/admin/AdminOverview.css', 'w', encoding='utf-8') as f:
    f.write(content + css_valid)

print('Done!')

