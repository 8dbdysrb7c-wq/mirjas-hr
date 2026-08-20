import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, FileSpreadsheet, Image as ImageIcon, CheckCircle, AlertCircle, AlertTriangle, XCircle, Trash2, Link as LinkIcon, Check, Plus, Loader2, X, ChevronDown, ChevronUp, List } from 'lucide-react';
import Select from './SearchSelect';
import { getBarcodes, saveBarcode, deleteBarcode, getStock, saveStockItem } from '../store';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Html5Qrcode } from 'html5-qrcode';

const MySwal = withReactContent(Swal);

// EAN-13 validation logic
const isValidEAN13 = (barcode) => {
  if (!/^\d{13}$/.test(barcode)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(barcode[12]);
};

// General barcode validation
const validateBarcode = (barcodeStr, existingBarcodes, existingStockBarcodes) => {
  const b = String(barcodeStr).trim();
  if (!b) return null;
  
  const isDuplicate = existingBarcodes.some(eb => eb.value === b) || existingStockBarcodes.has(b);
  if (isDuplicate) return { value: b, status: 'مكرر', color: 'blue' };

  if (/^\d{13}$/.test(b)) {
    if (isValidEAN13(b)) return { value: b, status: 'صحيح', color: 'green' };
    return { value: b, status: 'غير صالح', color: 'red', notes: 'EAN-13 Checksum غير صحيح' };
  }
  
  if (/^[A-Za-z0-9_-]{5,20}$/.test(b)) {
    return { value: b, status: 'مراجعة', color: 'yellow', notes: 'تنسيق غير مألوف' };
  }
  
  return { value: b, status: 'غير صالح', color: 'red', notes: 'طول/تنسيق غير مقبول' };
};

const BarcodeManagerTab = ({ user }) => {
  const [barcodes, setBarcodes] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [reviewList, setReviewList] = useState(() => {
    try {
      const saved = localStorage.getItem('barcodeReviewList');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showReview, setShowReview] = useState(() => {
    return localStorage.getItem('barcodeShowReview') === 'true';
  });
  const [savingIndex, setSavingIndex] = useState(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [showBarcodes, setShowBarcodes] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('barcodeReviewList', JSON.stringify(reviewList));
  }, [reviewList]);

  useEffect(() => {
    localStorage.setItem('barcodeShowReview', showReview);
  }, [showReview]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bcList, stList] = await Promise.all([getBarcodes(), getStock()]);
      setBarcodes(bcList);
      setStockItems(stList);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    
    // Auto-fix script for wrongly overwritten itemNumbers
    const fixItemNumber = async () => {
      try {
        const { collection, getDocs, setDoc } = require('firebase/firestore');
        const stockSnap = await getDocs(collection(db, 'stock'));
        
        let docsToFix = [];
        stockSnap.forEach(d => {
          const data = d.data();
          if (data.itemNumber && /^\d{10,15}$/.test(data.itemNumber)) {
             docsToFix.push(d);
          }
        });
        
        if (docsToFix.length > 0) {
          const salesSnap = await getDocs(collection(db, 'sales_orders'));
          const prepSnap = await getDocs(collection(db, 'preparation_orders'));
          const ordersSnap = await getDocs(collection(db, 'orders'));

          for (const targetDoc of docsToFix) {
             let oldNum = null;
             
             const findOld = (snap) => {
               snap.forEach(d => {
                 (d.data().items || []).forEach(i => {
                   if (i.name === targetDoc.data().name && i.itemNumber && !/^\d{10,15}$/.test(i.itemNumber)) {
                     oldNum = i.itemNumber;
                   }
                 });
               });
             };
             
             findOld(salesSnap);
             if (!oldNum) findOld(prepSnap);
             if (!oldNum) findOld(ordersSnap);
             
             if (oldNum) {
               await setDoc(targetDoc.ref, { ...targetDoc.data(), itemNumber: oldNum, itemCode: targetDoc.data().itemNumber });
               console.log("Fixed itemNumber to:", oldNum, "and moved barcode to itemCode for", targetDoc.data().name);
             } else {
               // Fallback: If we really can't find it, look at the other items with same name
               stockSnap.forEach(d => {
                 const dData = d.data();
                 if (dData.name === targetDoc.data().name && dData.itemNumber && !/^\d{10,15}$/.test(dData.itemNumber)) {
                    oldNum = dData.itemNumber;
                 }
               });
               if (oldNum) {
                 await setDoc(targetDoc.ref, { ...targetDoc.data(), itemNumber: oldNum, itemCode: targetDoc.data().itemNumber });
               }
             }
          }
        }
      } catch (e) {
        console.error("Auto-fix error:", e);
      }
    };
    fixItemNumber();
    
  }, []);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setProcessing(true);
    
    try {
      const existingStockBarcodes = new Set();
      stockItems.forEach(item => {
        if (item.barcode) existingStockBarcodes.add(item.barcode);
        if (item.barcodes && Array.isArray(item.barcodes)) {
           item.barcodes.forEach(b => existingStockBarcodes.add(b));
        }
      });

      let extractedItems = []; // Array of { barcode, name }
      let html5QrCode = null;
      let errorFiles = [];

      for (const file of files) {
        if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data);
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            json.forEach(row => {
              row.forEach((cell, idx) => {
                const str = String(cell).trim();
                if (str && str.length >= 5 && str.length <= 30 && /^[A-Za-z0-9_-]+$/.test(str)) {
                  let possibleName = row.filter((c, i) => i !== idx && c).join(' - ').trim();
                  extractedItems.push({ barcode: str, name: possibleName });
                }
              });
            });
          });
        } else if (file.name.match(/\.(docx)$/i)) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const lines = result.value.split('\n');
          lines.forEach(line => {
            const matches = line.match(/[A-Za-z0-9_-]{5,30}/g);
            if (matches) {
              matches.forEach(m => {
                 let possibleName = line.replace(m, '').trim();
                 extractedItems.push({ barcode: m, name: possibleName });
              });
            }
          });
        } else if (file.name.match(/\.(png|jpe?g|webp)$/i)) {
          // Image Processing with html5-qrcode
          try {
            if (!html5QrCode) {
              html5QrCode = new Html5Qrcode("hidden-qr-reader"); // We need a hidden div
            }
            const result = await html5QrCode.scanFile(file, true);
            if (result) {
              extractedItems.push({ barcode: result, name: file.name });
            }
          } catch (err) {
            console.error(`Barcode read error from image ${file.name}`, err);
            errorFiles.push(file.name);
          }
        } else {
          errorFiles.push(file.name);
        }
      }

      if (extractedItems.length === 0) {
        let msg = 'لم يتم العثور على باركودات في الملفات المرفقة.';
        if (errorFiles.length > 0) msg += ` تعذر قراءة بعض الملفات مثل: ${errorFiles.slice(0,3).join(', ')}`;
        MySwal.fire('تنبيه', msg, 'warning');
        setProcessing(false);
        e.target.value = null;
        return;
      }

      if (errorFiles.length > 0 && files.length > 1) {
        MySwal.fire({
           title: 'ملاحظة', 
           text: `تم قراءة بعض الملفات بنجاح، ولكن تعذر قراءة ${errorFiles.length} ملف (مثل: ${errorFiles.slice(0,3).join(', ')})`, 
           icon: 'info',
           toast: true,
           position: 'top-end',
           showConfirmButton: false,
           timer: 4000
        });
      }

      const results = [];
      const seen = new Set();
      extractedItems.forEach(item => {
        if (seen.has(item.barcode)) return;
        seen.add(item.barcode);
        
        const res = validateBarcode(item.barcode, barcodes, existingStockBarcodes);
        if (res) results.push({ ...res, linkedItemId: '', suggestedName: item.name });
      });

      if (results.length === 0) {
        MySwal.fire('معلومة', 'لم يتم العثور على باركودات في الملف المرفق.', 'info');
      } else {
        setReviewList(results);
        setShowReview(true);
      }
    } catch (error) {
      console.error(error);
      MySwal.fire('خطأ', 'حدث خطأ أثناء معالجة الملف', 'error');
    }
    
    setProcessing(false);
    e.target.value = null;
  };

  const handleSaveSingleReview = async (item, idx) => {
    if (item.status !== 'صحيح' && item.status !== 'مراجعة') {
      MySwal.fire('خطأ', 'لا يمكن حفظ باركود غير صالح أو مكرر.', 'error');
      return;
    }
    setSavingIndex(idx);

    try {
      const newBc = {
        value: item.value,
        status: 'معتمد',
        linkedItemId: item.linkedItemId || '',
        linkedItemName: item.linkedItemId ? stockItems.find(s => s.id === item.linkedItemId)?.name : '',
        createdAt: new Date().toISOString(),
        createdBy: user?.name || 'المدير'
      };
      await saveBarcode(newBc);
      
      if (item.linkedItemId) {
        const sItem = stockItems.find(s => s.id === item.linkedItemId);
        if (sItem) {
          const currentBarcodes = sItem.barcodes || [];
          if (!currentBarcodes.includes(item.value)) {
            await saveStockItem({
              ...sItem,
              itemCode: item.value, // تحديث رمز الصنف ليصبح الباركود
              barcodes: [...currentBarcodes, item.value],
              barcode: item.value // primary
            });
          } else {
            // Even if already in barcodes array, update the itemCode to reflect the primary barcode
            await saveStockItem({
              ...sItem,
              itemCode: item.value,
              barcode: item.value
            });
          }
        }
      }
      
      const newReview = [...reviewList];
      newReview[idx].saved = true;
      setReviewList(newReview);
      setSavingIndex(null);

      MySwal.fire({ title: 'تم الحفظ بنجاح', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      
      const allDone = newReview.every(r => r.saved || (r.status !== 'صحيح' && r.status !== 'مراجعة'));
      if (allDone && newReview.length > 0) {
        // Optional: auto-close if everything saveable is saved
      }
      loadData();
    } catch (err) {
      console.error(err);
      setSavingIndex(null);
      MySwal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleSaveAllReview = async () => {
    const itemsToSave = reviewList.map((item, idx) => ({ item, idx }))
      .filter(({ item }) => !item.saved && (item.color === 'green' || item.color === 'yellow'));
      
    if (itemsToSave.length === 0) {
      MySwal.fire('تنبيه', 'لا يوجد باركودات صالحة وجديدة لحفظها.', 'info');
      return;
    }

    setIsSavingAll(true);
    let successCount = 0;
    const newReview = [...reviewList];

    try {
      const savePromises = itemsToSave.map(async ({ item, idx }) => {
        const newBc = {
          value: item.value,
          status: 'معتمد',
          linkedItemId: item.linkedItemId || '',
          linkedItemName: item.linkedItemId ? stockItems.find(s => s.id === item.linkedItemId)?.name : '',
          createdAt: new Date().toISOString(),
          createdBy: user?.name || 'المدير'
        };
        await saveBarcode(newBc);
        
        if (item.linkedItemId) {
          const sItem = stockItems.find(s => s.id === item.linkedItemId);
          if (sItem) {
            const currentBarcodes = sItem.barcodes || [];
            if (!currentBarcodes.includes(item.value)) {
              await saveStockItem({
                ...sItem,
                itemCode: item.value,
                barcodes: [...currentBarcodes, item.value],
                barcode: item.value
              });
            } else {
              await saveStockItem({
                ...sItem,
                itemCode: item.value,
                barcode: item.value
              });
            }
          }
        }
        
        newReview[idx].saved = true;
        successCount++;
      });

      await Promise.all(savePromises);
      
      setReviewList(newReview);
      MySwal.fire({ title: 'تم الحفظ', text: `تم حفظ ${successCount} باركود بنجاح.`, icon: 'success', timer: 2000, showConfirmButton: false });
      
      const allDone = newReview.every(r => r.saved || (r.status !== 'صحيح' && r.status !== 'مراجعة'));
      if (allDone) {
        setTimeout(() => setShowReview(false), 1500);
      }
      loadData();
    } catch (err) {
      console.error(err);
      MySwal.fire('خطأ', 'حدث خطأ أثناء حفظ بعض الباركودات', 'error');
    }
    setIsSavingAll(false);
  };

  const handleUndoSingleReview = async (item, idx) => {
    setSavingIndex(idx);
    try {
      // Find barcode ID to delete
      const allBarcodes = await getBarcodes();
      const bcToDelete = allBarcodes.find(b => b.value === item.value);
      if (bcToDelete) {
        await deleteBarcode(bcToDelete.id);
      }

      // Revert stock item if linked
      if (item.linkedItemId) {
        const sItem = stockItems.find(s => s.id === item.linkedItemId);
        if (sItem) {
          const itemKey = sItem.itemNumber || sItem.name;
          const allVariants = stockItems.filter(s => (s.itemNumber || s.name) === itemKey);
          
          const updatePromises = allVariants.map(variant => {
            const currentBarcodes = variant.barcodes || [];
            const newBarcodes = currentBarcodes.filter(b => b !== item.value);
            
            let newItemCode = variant.itemCode;
            if (variant.itemCode === item.value) {
              newItemCode = newBarcodes.length > 0 ? newBarcodes[0] : '';
            }
            
            return saveStockItem({
              ...variant,
              itemCode: newItemCode,
              barcodes: newBarcodes,
              barcode: newBarcodes.length > 0 ? newBarcodes[0] : ''
            });
          });
          
          await Promise.all(updatePromises);
        }
      }

      const newReview = [...reviewList];
      newReview[idx].saved = false;
      setReviewList(newReview);
      setSavingIndex(null);

      MySwal.fire({ title: 'تم التراجع بنجاح', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      loadData();
    } catch (err) {
      console.error(err);
      setSavingIndex(null);
      MySwal.fire('خطأ', 'حدث خطأ أثناء التراجع', 'error');
    }
  };

  const handleRemoveSingleReview = (idx) => {
    const newReview = [...reviewList];
    newReview.splice(idx, 1);
    setReviewList(newReview);
    if (newReview.length === 0) {
      setShowReview(false);
    }
  };

  const handleDeleteBarcode = async (id) => {
    if (await MySwal.fire({
      title: 'هل أنت متأكد؟',
      text: "سيتم حذف هذا الباركود نهائياً!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then(r => r.isConfirmed)) {
      try {
        await deleteBarcode(id);
        setBarcodes(barcodes.filter(b => b.id !== id));
        MySwal.fire('تم الحذف', 'تم حذف الباركود بنجاح', 'success');
      } catch(e) {
        MySwal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleLinkBarcode = async (barcodeId, itemId) => {
    const bc = barcodes.find(b => b.id === barcodeId);
    const sItem = stockItems.find(s => s.id === itemId);
    if (!bc || !sItem) return;

    try {
      await saveBarcode({
        ...bc,
        linkedItemId: sItem.id,
        linkedItemName: sItem.name
      });
      
      const itemKey = sItem.itemNumber || sItem.name;
      const allVariants = stockItems.filter(s => (s.itemNumber || s.name) === itemKey);
      
      const updatePromises = allVariants.map(variant => {
        const currentBarcodes = variant.barcodes || [];
        if (!currentBarcodes.includes(bc.value)) {
           return saveStockItem({
             ...variant,
             itemCode: bc.value, // تحديث رمز الصنف ليصبح الباركود
             barcodes: [...currentBarcodes, bc.value],
             barcode: bc.value
           });
        } else {
           return saveStockItem({
             ...variant,
             itemCode: bc.value,
             barcode: bc.value
           });
        }
      });
      
      await Promise.all(updatePromises);
      
      MySwal.fire('تم', 'تم ربط الباركود بجميع ألوان وتشكيلات الصنف بنجاح', 'success');
      loadData();
    } catch (e) {
      MySwal.fire('خطأ', 'حدث خطأ أثناء الربط', 'error');
    }
  };

  // Group stock items to avoid duplicates for items with multiple colors/specs
  const uniqueStockItems = [];
  const seenItemKeys = new Set();
  
  stockItems.forEach(s => {
    const key = s.itemNumber || s.name;
    if (!seenItemKeys.has(key)) {
      seenItemKeys.add(key);
      uniqueStockItems.push(s);
    }
  });

  const stockOptions = uniqueStockItems.map(s => ({ value: s.id, label: `${s.name} (${s.itemNumber || '-'})` }));

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div id="hidden-qr-reader" style={{ display: 'none' }}></div>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          إدارة الباركودات
        </h2>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            multiple
            accept=".png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.docx" 
          />
          <button 
            onClick={() => fileInputRef.current.click()}
            disabled={processing}
            style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', border: 'none', cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1, boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
          >
            {processing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            استيراد الباركودات
          </button>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
        <p className="text-sm text-slate-600 mb-2"><strong>طرق الاستيراد المدعومة:</strong></p>
        <ul className="text-sm text-slate-500 list-disc list-inside space-y-1">
          <li><strong>الصور:</strong> قراءة متطورة للباركودات من الصور (تدعم EAN, UPC, QR وغيرها).</li>
          <li><strong>الإكسيل:</strong> استخراج تلقائي لجميع أرقام الباركودات من خلايا الجداول.</li>
          <li><strong>الوورد:</strong> استخراج ذكي لأرقام الباركودات من داخل المستندات النصية.</li>
        </ul>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
          <button
            onClick={() => setShowBarcodes(!showBarcodes)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              outline: 'none',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              fontSize: '15px',
              fontWeight: '600',
              color: '#334155',
              textAlign: 'right',
              direction: 'rtl'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05)';
            }}
          >
            <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <List className="text-emerald-600" size={20} />
              <span>قائمة الباركودات المثبتة ({barcodes.length})</span>
            </div>
            {showBarcodes ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
          </button>
          
          {showBarcodes && (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="p-3 font-semibold rounded-tr-lg">الباركود</th>
                <th className="p-3 font-semibold text-center">تاريخ الإضافة</th>
                <th className="p-3 font-semibold">ارتباط الصنف</th>
                <th className="p-3 font-semibold rounded-tl-lg">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {barcodes.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-500">لا يوجد باركودات معتمدة حالياً.</td></tr>
              ) : (
                barcodes.map(bc => (
                  <tr key={bc.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-lg">{bc.value}</td>
                    <td className="p-3 text-slate-600 text-center">{new Date(bc.createdAt).toLocaleDateString('en-GB')}</td>
                    <td className="p-3">
                      {bc.linkedItemId ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                          <CheckCircle className="w-4 h-4" />
                          {bc.linkedItemName}
                        </span>
                      ) : (
                      <Select
                        options={stockOptions}
                        placeholder="ربط بصنف..."
                        isSearchable
                        isClearable={false}
                        onChange={(selectedOption) => {
                          if(selectedOption) handleLinkBarcode(bc.id, selectedOption.value);
                        }}
                        value={null}
                        styles={{
                          control: (base) => ({ ...base, minWidth: '220px', borderRadius: '8px', fontSize: '14px' }),
                          menu: (base) => ({ ...base, zIndex: 9999, textAlign: 'right' })
                        }}
                        noOptionsMessage={() => "لا يوجد أصناف"}
                      />
                      )}
                    </td>
                    <td className="p-3">
                      <button 
                        onClick={() => handleDeleteBarcode(bc.id)} 
                        title="حذف"
                        style={{
                          color: '#ef4444',
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #fca5a5',
                          padding: '8px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          outline: 'none',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                      >
                        <Trash2 size={20} strokeWidth={2.2} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <CheckCircle className="text-emerald-600" />
                مراجعة الباركودات المستخرجة
              </h3>
              <button 
                onClick={() => setShowReview(false)} 
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex gap-4 mb-4 text-sm font-medium">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> صحيح ({reviewList.filter(r => r.color === 'green').length})</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> مكرر ({reviewList.filter(r => r.color === 'blue').length})</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> غير صالح ({reviewList.filter(r => r.color === 'red').length})</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> مراجعة ({reviewList.filter(r => r.color === 'yellow').length})</div>
              </div>

              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="p-2 border font-semibold">الباركود</th>
                    <th className="p-2 border font-semibold">اسم الصنف (مقترح)</th>
                    <th className="p-2 border font-semibold">الحالة</th>
                    <th className="p-2 border font-semibold">ملاحظات</th>
                    <th className="p-2 border font-semibold">ربط بصنف (اختياري)</th>
                    <th className="p-2 border font-semibold">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewList.map((item, idx) => (
                    <tr key={idx} className={
                      item.color === 'green' ? 'bg-emerald-50' : 
                      item.color === 'red' ? 'bg-red-50' : 
                      item.color === 'blue' ? 'bg-blue-50' : 'bg-yellow-50'
                    }>
                      <td className="p-2 border font-mono">{item.value}</td>
                      <td className="p-2 border text-sm text-slate-600">{item.suggestedName || '-'}</td>
                      <td className={`p-2 border font-bold ${
                        item.color === 'green' ? 'text-emerald-700' : 
                        item.color === 'red' ? 'text-red-700' : 
                        item.color === 'blue' ? 'text-blue-700' : 'text-yellow-700'
                      }`}>
                        {item.status}
                      </td>
                      <td className="p-2 border text-sm text-slate-600">{item.notes || '-'}</td>
                      <td className="p-2 border">
                        {(item.color === 'green' || item.color === 'yellow') ? (
                          <Select
                            options={stockOptions}
                            placeholder="-- بدون ربط حالياً --"
                            isSearchable
                            isClearable
                            isDisabled={item.saved}
                            value={stockOptions.find(opt => opt.value === item.linkedItemId) || null}
                            onChange={(selectedOption) => {
                              const newReview = [...reviewList];
                              newReview[idx].linkedItemId = selectedOption ? selectedOption.value : '';
                              setReviewList(newReview);
                            }}
                            menuPosition="fixed"
                            menuPortalTarget={document.body}
                            maxMenuHeight={450}
                            styles={{
                              control: (base) => ({ ...base, minWidth: '250px', borderRadius: '8px', fontSize: '14px', backgroundColor: '#ffffff' }),
                              menu: (base) => ({ ...base, zIndex: 9999, textAlign: 'right' }),
                              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                              option: (base) => ({ ...base, textAlign: 'right' })
                            }}
                            noOptionsMessage={() => "لا يوجد أصناف"}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">لا يمكن ربطه</span>
                        )}
                      </td>
                      <td className="p-2 border">
                        <div className="flex gap-2 justify-center items-center">
                          {item.saved ? (
                            <>
                              <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={16} /> تم الحفظ
                              </span>
                              <button 
                                onClick={() => handleUndoSingleReview(item, idx)}
                                disabled={savingIndex === idx}
                                style={{ backgroundColor: '#f59e0b', color: 'white', padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: savingIndex === idx ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '11px', opacity: savingIndex === idx ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="تراجع عن الحفظ والربط"
                              >
                                {savingIndex === idx ? <Loader2 size={12} className="animate-spin" /> : 'تراجع'}
                              </button>
                            </>
                          ) : (
                            <>
                              {(item.color === 'green' || item.color === 'yellow') && (
                                <button 
                                  onClick={() => handleSaveSingleReview(item, idx)}
                                  disabled={savingIndex === idx}
                                  style={{ backgroundColor: '#10b981', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: savingIndex === idx ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', opacity: savingIndex === idx ? 0.7 : 1 }}
                                >
                                  {savingIndex === idx ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} حفظ
                                </button>
                              )}
                              <button 
                                onClick={() => handleRemoveSingleReview(idx)}
                                style={{ backgroundColor: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={14} /> إلغاء
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>ملاحظة: يمكنك حفظ الباركودات الصحيحة والمراجعة بشكل فردي، وإلغاء الباركودات المكررة أو غير الصالحة من القائمة.</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={handleSaveAllReview}
                disabled={isSavingAll || !reviewList.some(r => !r.saved && (r.color === 'green' || r.color === 'yellow'))}
                style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: (isSavingAll || !reviewList.some(r => !r.saved && (r.color === 'green' || r.color === 'yellow'))) ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', opacity: (isSavingAll || !reviewList.some(r => !r.saved && (r.color === 'green' || r.color === 'yellow'))) ? 0.6 : 1 }}
              >
                {isSavingAll ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                حفظ الكل المتاح
              </button>
              <button 
                onClick={() => setShowReview(false)} 
                style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mock ScanLine icon because it's not imported above
const ScanLine = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
    <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
    <line x1="7" y1="12" x2="17" y2="12"></line>
  </svg>
);

export default BarcodeManagerTab;
