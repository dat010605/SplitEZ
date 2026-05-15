import { create } from 'zustand';

export interface Invoice {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: string; // userId
  paidByName: string;
  date: any;
  items?: Array<{ name: string; price: number }>;
}

interface InvoiceState {
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
  setInvoices: (invoices: Invoice[]) => void;
  getInvoicesByGroup: (groupId: string) => Invoice[];
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  addInvoice: (invoice) => set((state) => {
    // Prevent duplicate IDs
    if (state.invoices.some(inv => inv.id === invoice.id)) {
      return state;
    }
    return { invoices: [invoice, ...state.invoices] };
  }),
  setInvoices: (newInvoices) => set((state) => {
    // When setting invoices, we might want to merge or replace.
    // Given the current usage in GroupDetailScreen, we are replacing group-specific invoices.
    // To be safe, let's ensure the final array has unique IDs.
    const seen = new Set();
    const uniqueInvoices = newInvoices.filter(inv => {
      if (seen.has(inv.id)) return false;
      seen.add(inv.id);
      return true;
    });
    return { invoices: uniqueInvoices };
  }),
  getInvoicesByGroup: (groupId) => {
    return get().invoices.filter(inv => inv.groupId === groupId);
  },
}));
