import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where
} from 'firebase/firestore';

export const getQuotes = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'quotes'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getQuotes:", error);
    return [];
  }
};

export const getQuotesByDateRange = async (startDate, endDate) => {
  try {
    const q = query(
      collection(db, 'quotes'),
      where('quoteDate', '>=', startDate),
      where('quoteDate', '<=', endDate)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getQuotesByDateRange:", error);
    return [];
  }
};

export const getQuoteById = async (id) => {
  try {
    const docRef = doc(db, 'quotes', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id };
    }
    return null;
  } catch (error) {
    console.error("Error in getQuoteById:", error);
    return null;
  }
};

export const saveQuote = async (quote) => {
  try {
    const docRef = quote.id ? doc(db, 'quotes', quote.id) : doc(collection(db, 'quotes'));
    const id = docRef.id;
    let finalQuoteNumber = quote.quoteNumber;

    if (!quote.id && !finalQuoteNumber) {
      // Auto-generate quote number: e.g. Q26-0001
      const currentYear = new Date().getFullYear().toString().substr(-2);
      const prefix = `Q${currentYear}-`;
      const allQuotes = await getDocs(collection(db, 'quotes'));
      let maxNum = 0;
      allQuotes.forEach(d => {
        const q = d.data();
        if (q.quoteNumber && q.quoteNumber.startsWith(prefix)) {
          const num = parseInt(q.quoteNumber.replace(prefix, ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      finalQuoteNumber = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
    }

    const fullQuote = { 
      createdAt: quote.createdAt || new Date().toISOString(), 
      ...quote, 
      quoteNumber: finalQuoteNumber, 
      id 
    };

    await setDoc(docRef, fullQuote);
    return fullQuote;
  } catch (error) {
    console.error("Error in saveQuote:", error);
    return null;
  }
};

export const deleteQuote = async (id) => {
  try {
    await deleteDoc(doc(db, 'quotes', id));
  } catch (error) {
    console.error("Error in deleteQuote:", error);
  }
};
