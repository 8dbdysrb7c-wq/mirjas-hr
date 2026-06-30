import re
import sys

def main():
    filepath = 'src/pages/admin/AdminSettings.jsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add import
    import_statement = "import WhatsAppSettingsTab from './WhatsAppSettingsTab';\n"
    if 'WhatsAppSettingsTab' not in content:
        # insert after import of hrSettingsIllustration
        content = re.sub(r"(import hrSettingsIllustration.*?\n)", r"\1" + import_statement, content)
    
    # 2. Add Tab
    tab_html = """        <div className={`premium-tab ${activeTab === 'whatsapp' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('whatsapp')}>
          <MessageSquare size={18} /> <span>إعدادات الواتساب</span>
        </div>
      </div>"""
    content = re.sub(r"(<div className={`premium-tab \${activeTab === 'hr'.*?</div>\s*)</div>", r"\1" + tab_html, content, count=1, flags=re.DOTALL)

    # 3. Add Content Block
    content_block = """                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="admin-content-layout space-y-8 animate-fade-in">
            <WhatsAppSettingsTab />
          </div>
        )}
      </div>
    </div>"""
    content = re.sub(r"(\s+</div>\s+</div>\s+</div>\s+</div>\s+)}\s+)</div>\s+</div>\s*$", r"\1" + content_block, content, count=1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Patched AdminSettings.jsx")

if __name__ == '__main__':
    main()
