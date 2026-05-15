
export interface Transaction {
    from: string;
    to: string;
    amount: number;
    fromName?: string;
    toName?: string;
  }
  
  export const simplifyDebts = (balances: { [userId: string]: { name: string, net: number } }) => {
    // Tách danh sách thành 2 nhóm: Người nợ (net < 0) và Người nhận (net > 0)
    let debtors = Object.keys(balances)
      .filter(id => balances[id].net < -0.01)
      .map(id => ({ id, ...balances[id] }))
      .sort((a, b) => a.net - b.net); // Nợ nhiều nhất đứng đầu
  
    let creditors = Object.keys(balances)
      .filter(id => balances[id].net > 0.01)
      .map(id => ({ id, ...balances[id] }))
      .sort((a, b) => b.net - a.net); // Nhận nhiều nhất đứng đầu
  
    const result: Transaction[] = [];
  
    let i = 0; // trỏ vào debtors
    let j = 0; // trỏ vào creditors
  
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      
      // Số tiền giao dịch là giá trị nhỏ hơn giữa (số tiền nợ) và (số tiền cần nhận)
      const amount = Math.min(Math.abs(debtor.net), creditor.net);
      
      result.push({
        from: debtor.id,
        fromName: debtor.name,
        to: creditor.id,
        toName: creditor.name,
        amount: Math.round(amount)
      });
  
      // Cập nhật lại số dư sau giao dịch
      debtor.net += amount;
      creditor.net -= amount;
  
      if (Math.abs(debtor.net) < 0.01) i++;
      if (Math.abs(creditor.net) < 0.01) j++;
    }
  
    return result;
  };