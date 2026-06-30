import re

with open('src/pages/admin/AdminCustomers.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the initialData to include status
content = content.replace(
    "const initialData = isEdit ? { ...customer } : { name: '', phone: '', location: '' };",
    "const initialData = isEdit ? { ...customer } : { name: '', phone: '', location: '', status: 'نشط' };"
)

# 2. Add Status Dropdown to Modal HTML
# Find the end of the location input group:
#             <input id="swal-location" class="premium-input" placeholder="مثال: دبي - القوز" value="${initialData.location || ''}">
#           </div>
#         </div>

old_modal = """            <input id="swal-location" class="premium-input" placeholder="مثال: دبي - القوز" value="${initialData.location || ''}">
          </div>
        </div>"""

new_modal = """            <input id="swal-location" class="premium-input" placeholder="مثال: دبي - القوز" value="${initialData.location || ''}">
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity text-muted"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
              حالة العميل
            </label>
            <select id="swal-status" class="premium-input">
              <option value="عميل جديد" ${initialData.status === 'عميل جديد' ? 'selected' : ''}>عميل جديد</option>
              <option value="عميل محتمل" ${initialData.status === 'عميل محتمل' ? 'selected' : ''}>عميل محتمل</option>
              <option value="نشط" ${(!initialData.status || initialData.status === 'نشط') ? 'selected' : ''}>نشط</option>
              <option value="غير نشط" ${initialData.status === 'غير نشط' ? 'selected' : ''}>غير نشط</option>
              <option value="محظور" ${initialData.status === 'محظور' ? 'selected' : ''}>محظور</option>
            </select>
          </div>
        </div>"""
content = content.replace(old_modal, new_modal)

# 3. Update preConfirm to grab status
content = content.replace(
    "const location = document.getElementById('swal-location').value;",
    "const location = document.getElementById('swal-location').value;\n        const status = document.getElementById('swal-status').value;"
)
content = content.replace(
    "return { name, phone, location, id: isEdit ? customer.id : null };",
    "return { name, phone, location, status, id: isEdit ? customer.id : null };"
)

# 4. Add table header for Status
content = content.replace(
    """<th onClick={() => handleSort('location')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">الموقع <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th style={{ width: '150px', textAlign: 'center' }}>إجراءات</th>""",
    """<th onClick={() => handleSort('location')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">الموقع <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">حالة العميل <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th style={{ width: '150px', textAlign: 'center' }}>إجراءات</th>"""
)

# 5. Add table cell for Status
old_tds = """<td data-label="الموقع">
                      <div className="flex items-center gap-2 justify-end lg:justify-start text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        {customer.location || '---'}
                      </div>
                    </td>
                    <td data-label="إجراءات" style={{ textAlign: 'center' }}>"""

new_tds = """<td data-label="الموقع">
                      <div className="flex items-center gap-2 justify-end lg:justify-start text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        {customer.location || '---'}
                      </div>
                    </td>
                    <td data-label="حالة العميل">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        (customer.status || 'نشط') === 'نشط' ? 'bg-emerald-100 text-emerald-700' :
                        (customer.status === 'غير نشط') ? 'bg-slate-100 text-slate-700' :
                        (customer.status === 'عميل جديد') ? 'bg-blue-100 text-blue-700' :
                        (customer.status === 'عميل محتمل') ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {customer.status || 'نشط'}
                      </span>
                    </td>
                    <td data-label="إجراءات" style={{ textAlign: 'center' }}>"""

content = content.replace(old_tds, new_tds)

with open('src/pages/admin/AdminCustomers.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
