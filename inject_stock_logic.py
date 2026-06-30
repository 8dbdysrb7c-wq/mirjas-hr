import os

base_dir = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src"
sales_path = os.path.join(base_dir, "pages", "admin", "AdminSales.jsx")
prod_path = os.path.join(base_dir, "pages", "admin", "AdminProduction.jsx")

def replace_in_file(filepath, replacements):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. AdminSales.jsx (Sales Orders)
sales_old_fn = """  const handleUpdateStatus = async (order, newStatus) => {
    await saveSalesOrder({ ...order, status: newStatus, lastActionBy: user?.name || 'مدير', statusUpdateDate: getLocalDateStr(new Date()) });"""

sales_new_fn = """  const handleUpdateStatus = async (order, newStatus) => {
    // الخصم التلقائي من المخزون
    if (newStatus === 'تم التوصيل' && order.status !== 'تم التوصيل') {
      try {
        const currentStock = await getStock();
        for (const item of (order.items || [])) {
          if (!item.productName || !item.quantity) continue;
          const stockItem = currentStock.find(s => s.name === item.productName);
          if (stockItem) {
            const deduction = Number(item.quantity) || 0;
            // السماح بالسالب كما طلبنا في التقرير
            const newQuantity = Number(stockItem.quantity) - deduction;
            await saveStockItem({
              ...stockItem,
              quantity: newQuantity,
              lastMovement: 'إخراج',
              lastMovementDate: getLocalDateStr(new Date()),
              lastRecipient: order.customerName,
              notes: `خصم تلقائي - طلبية مبيعات رقم ${order.orderNumber}`
            });
          }
        }
      } catch (err) {
        console.error("Error updating stock:", err);
      }
    }

    await saveSalesOrder({ ...order, status: newStatus, lastActionBy: user?.name || 'مدير', statusUpdateDate: getLocalDateStr(new Date()) });"""

replace_in_file(sales_path, [(sales_old_fn, sales_new_fn)])


# 2. AdminProduction.jsx (Production Orders)
# First, ensure getStock and saveStockItem are imported
prod_old_import = """import { getOrders, saveOrder, deleteOrder, updateOrderStatus, getCustomers, saveCustomer, getGlobalSettings, isAdmin, canPerformAction, addLog } from '../../store';"""
prod_new_import = """import { getOrders, saveOrder, deleteOrder, updateOrderStatus, getCustomers, saveCustomer, getGlobalSettings, isAdmin, canPerformAction, addLog, getStock, saveStockItem } from '../../store';"""

prod_old_fn = """  const handleUpdateStatus = async (orderId, newStatus) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;
    
    await saveOrder({ 
      ...orderToUpdate, 
      status: newStatus,
      lastActionBy: user?.name || 'مدير',
      statusUpdateDate: getLocalDateStr(new Date())
    });"""

prod_new_fn = """  const handleUpdateStatus = async (orderId, newStatus) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;
    
    // الإضافة التلقائية للمخزون
    if (newStatus === 'منتهي' && orderToUpdate.status !== 'منتهي') {
      try {
        const currentStock = await getStock();
        for (const item of (orderToUpdate.items || [])) {
          if (!item.productName || !item.quantity) continue;
          let stockItem = currentStock.find(s => s.name === item.productName);
          
          if (stockItem) {
            const addition = Number(item.quantity) || 0;
            const newQuantity = Number(stockItem.quantity) + addition;
            await saveStockItem({
              ...stockItem,
              quantity: newQuantity,
              lastMovement: 'إدخال',
              lastMovementDate: getLocalDateStr(new Date()),
              lastRecipient: 'قسم الإنتاج',
              notes: `إضافة تلقائية - أمر إنتاج رقم ${orderToUpdate.orderNumber}`
            });
          } else {
            // إذا لم يكن الصنف موجوداً، نقوم بإنشائه في المخزون
            const generateNextID = () => {
              if (currentStock.length === 0) return 'SKU-001';
              const ids = currentStock.map(si => {
                const match = si.itemNumber?.match(/\d+/);
                return match ? parseInt(match[0]) : 0;
              });
              const maxID = Math.max(...ids, 0);
              return `SKU-${String(maxID + 1).padStart(3, '0')}`;
            };
            
            await saveStockItem({
              itemNumber: generateNextID(),
              itemCode: '',
              name: item.productName,
              category: 'منتج تام الصنع',
              warehouse: 'المستودع الرئيسي',
              location: '',
              spec: item.colorModel || '',
              unit: 'حبة',
              quantity: Number(item.quantity) || 0,
              minLimit: 0,
              lastMovement: 'إدخال',
              lastMovementDate: getLocalDateStr(new Date()),
              lastRecipient: 'قسم الإنتاج',
              notes: `تم الإنشاء التلقائي - أمر إنتاج رقم ${orderToUpdate.orderNumber}`
            });
            // Update local ref to avoid ID collisions if multiple items are new
            currentStock.push({ name: item.productName, quantity: Number(item.quantity) || 0 }); 
          }
        }
      } catch (err) {
        console.error("Error updating stock from production:", err);
      }
    }

    await saveOrder({ 
      ...orderToUpdate, 
      status: newStatus,
      lastActionBy: user?.name || 'مدير',
      statusUpdateDate: getLocalDateStr(new Date())
    });"""

replace_in_file(prod_path, [(prod_old_import, prod_new_import), (prod_old_fn, prod_new_fn)])

print("Logic injected.")
