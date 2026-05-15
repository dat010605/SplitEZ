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
  getInvoicesByGroup: (groupId: string) => Invoice[];
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  addInvoice: (invoice) => set((state) => ({ 
    invoices: [invoice, ...state.invoices] 
  })),
  getInvoicesByGroup: (groupId) => {
    return get().invoices.filter(inv => inv.groupId === groupId);
  },
}));
