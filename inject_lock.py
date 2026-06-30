import os

base_dir = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src"
prod_path = os.path.join(base_dir, "pages", "admin", "AdminProduction.jsx")
sales_path = os.path.join(base_dir, "pages", "admin", "AdminSales.jsx")

def replace_in_file(filepath, replacements):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. AdminProduction.jsx
prod_old_import = """  ArrowUpDown, ArrowUp, ArrowDown, GripVertical, AlertCircle, FileText, Info, Truck, Filter, CheckCircle, Navigation, MapPin
} from 'lucide-react';"""
prod_new_import = """  ArrowUpDown, ArrowUp, ArrowDown, GripVertical, AlertCircle, FileText, Info, Truck, Filter, CheckCircle, Navigation, MapPin, Lock
} from 'lucide-react';"""

prod_old_actions = """                        <td data-label="إجراءات" style={{ textAlign: 'center' }}>
                          <div className="flex flex-wrap gap-2 justify-center items-center">
                            <select 
                              className="input-field" 
                              style={{ padding: '0 0.5rem', width: '130px', height: '36px', fontSize: '13px', borderRadius: '8px', marginBottom: 0, border: '1px solid var(--primary-light)' }}
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            >
                              {globalSettings.productionStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button className="btn-premium-view" title="معاينة" onClick={() => handleOpenPreview(order)}>
                              <Eye size={16} />
                            </button>
                            {canPerformAction(user, 'EDIT', 'SALES', globalSettings) && (
                              <button className="btn-premium-edit" title="تعديل" onClick={() => handleOpenModal(order)}>
                                <Edit2 size={16} />
                              </button>
                            )}
                            {canPerformAction(user, 'DELETE', 'SALES', globalSettings) && (
                              <button className="btn-premium-delete" title="حذف" onClick={() => handleDelete(order.id)}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>"""

prod_new_actions = """                        <td data-label="إجراءات" style={{ textAlign: 'center' }}>
                          <div className="flex flex-wrap gap-2 justify-center items-center">
                            {order.status === 'منتهي' ? (
                              <div className="flex items-center gap-1 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200" title="الطلبية مغلقة ومسجلة في المخزون">
                                <span className="text-xs font-bold">مغلقة</span>
                                <Lock size={14} />
                              </div>
                            ) : (
                              <select 
                                className="input-field" 
                                style={{ padding: '0 0.5rem', width: '130px', height: '36px', fontSize: '13px', borderRadius: '8px', marginBottom: 0, border: '1px solid var(--primary-light)' }}
                                value={order.status}
                                onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                              >
                                {globalSettings.productionStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            )}
                            <button className="btn-premium-view" title="معاينة" onClick={() => handleOpenPreview(order)}>
                              <Eye size={16} />
                            </button>
                            {order.status !== 'منتهي' && canPerformAction(user, 'EDIT', 'SALES', globalSettings) && (
                              <button className="btn-premium-edit" title="تعديل" onClick={() => handleOpenModal(order)}>
                                <Edit2 size={16} />
                              </button>
                            )}
                            {order.status !== 'منتهي' && canPerformAction(user, 'DELETE', 'SALES', globalSettings) && (
                              <button className="btn-premium-delete" title="حذف" onClick={() => handleDelete(order.id)}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>"""

replace_in_file(prod_path, [(prod_old_import, prod_new_import), (prod_old_actions, prod_new_actions)])

# 2. AdminSales.jsx
sales_old_import = """  Filter, UserCheck, Calendar, Navigation, MapPin
} from 'lucide-react';"""
sales_new_import = """  Filter, UserCheck, Calendar, Navigation, MapPin, Lock
} from 'lucide-react';"""

sales_old_actions = """                        <td data-label="إجراءات">
                          <div className="flex flex-wrap gap-2 justify-center items-center">
                            <select 
                              className="input-field" 
                              style={{ padding: '0 0.5rem', width: '120px', height: '36px', fontSize: '13px', borderRadius: '8px', marginBottom: 0, border: '1px solid var(--primary-light)' }}
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order, e.target.value)}
                            >
                              {globalSettings.salesStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button className="btn-premium-view" title="معاينة" onClick={() => handleOpenPreview(order)}>
                              <Eye size={16} />
                            </button>
                            {canPerformAction(user, 'EDIT', 'SALES', globalSettings) && (
                              <button className="btn-premium-edit" title="تعديل" onClick={() => handleOpenModal(order)}>
                                <Edit2 size={16} />
                              </button>
                            )}
                            {canPerformAction(user, 'DELETE', 'SALES', globalSettings) && (
                              <button className="btn-premium-delete" title="حذف" onClick={() => handleDelete(order.id)}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>"""

sales_new_actions = """                        <td data-label="إجراءات">
                          <div className="flex flex-wrap gap-2 justify-center items-center">
                            {order.status === 'تم التوصيل' ? (
                              <div className="flex items-center gap-1 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200" title="الطلبية مغلقة ومسجلة في المخزون">
                                <span className="text-xs font-bold">مغلقة</span>
                                <Lock size={14} />
                              </div>
                            ) : (
                              <select 
                                className="input-field" 
                                style={{ padding: '0 0.5rem', width: '120px', height: '36px', fontSize: '13px', borderRadius: '8px', marginBottom: 0, border: '1px solid var(--primary-light)' }}
                                value={order.status}
                                onChange={(e) => handleUpdateStatus(order, e.target.value)}
                              >
                                {globalSettings.salesStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            )}
                            <button className="btn-premium-view" title="معاينة" onClick={() => handleOpenPreview(order)}>
                              <Eye size={16} />
                            </button>
                            {order.status !== 'تم التوصيل' && canPerformAction(user, 'EDIT', 'SALES', globalSettings) && (
                              <button className="btn-premium-edit" title="تعديل" onClick={() => handleOpenModal(order)}>
                                <Edit2 size={16} />
                              </button>
                            )}
                            {order.status !== 'تم التوصيل' && canPerformAction(user, 'DELETE', 'SALES', globalSettings) && (
                              <button className="btn-premium-delete" title="حذف" onClick={() => handleDelete(order.id)}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>"""

replace_in_file(sales_path, [(sales_old_import, sales_new_import), (sales_old_actions, sales_new_actions)])
print("Lock injected.")
