import { db } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, query, orderBy, runTransaction } from 'firebase/firestore';

const advances = collection(db, 'hr_petty_cash');
const cents = value => Math.round(Number(value) * 100);
const validAmount = value => Number.isFinite(cents(value)) && cents(value) > 0;

export async function listPettyCash() {
  const snapshot = await getDocs(query(advances, orderBy('date', 'desc')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function createPettyCash({ employeeId, employeeName, date, amount }) {
  if (!employeeId || !date || !validAmount(amount)) throw new Error('أدخل الاسم والتاريخ ومبلغ سلفة صحيح');
  const ref = doc(advances);
  await setDoc(ref, { employeeId, employeeName, date, amountCents: cents(amount), spentCents: 0, createdAt: new Date().toISOString() });
  return ref.id;
}

export async function listPettyCashExpenses(advanceId) {
  const snapshot = await getDocs(query(collection(db, 'hr_petty_cash', advanceId, 'expenses'), orderBy('createdAt', 'asc')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function savePettyCashExpense(advanceId, input, expenseId = null) {
  const description = String(input.description || '').trim();
  const invoiceNumber = String(input.invoiceNumber || '').trim();
  if (!description || !invoiceNumber || !input.date || !validAmount(input.amount)) throw new Error('أدخل تاريخ الصرف وبيانه ورقم الفاتورة ومبلغًا صحيحًا');
  const advanceRef = doc(db, 'hr_petty_cash', advanceId);
  const expenseRef = expenseId ? doc(db, 'hr_petty_cash', advanceId, 'expenses', expenseId) : doc(collection(db, 'hr_petty_cash', advanceId, 'expenses'));
  const amountCents = cents(input.amount);
  await runTransaction(db, async transaction => {
    const advance = await transaction.get(advanceRef);
    if (!advance.exists()) throw new Error('السلفة غير موجودة');
    const previous = expenseId ? await transaction.get(expenseRef) : null;
    if (expenseId && !previous.exists()) throw new Error('حركة الصرف غير موجودة');
    const spentCents = (advance.data().spentCents || 0) - (previous?.data()?.amountCents || 0) + amountCents;
    if (spentCents > advance.data().amountCents) throw new Error('مبلغ الصرف يتجاوز المتبقي من السلفة');
    transaction.set(expenseRef, {
      description, invoiceNumber, date: input.date, amountCents,
      invoiceImage: input.invoiceImage || null,
      createdAt: previous?.data()?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    transaction.update(advanceRef, { spentCents });
  });
}

export async function deletePettyCashExpense(advanceId, expenseId) {
  const advanceRef = doc(db, 'hr_petty_cash', advanceId);
  const expenseRef = doc(db, 'hr_petty_cash', advanceId, 'expenses', expenseId);
  await runTransaction(db, async transaction => {
    const advance = await transaction.get(advanceRef);
    const expense = await transaction.get(expenseRef);
    if (!advance.exists() || !expense.exists()) throw new Error('السلفة أو حركة الصرف غير موجودة');
    transaction.update(advanceRef, { spentCents: Math.max(0, (advance.data().spentCents || 0) - expense.data().amountCents) });
    transaction.delete(expenseRef);
  });
}
