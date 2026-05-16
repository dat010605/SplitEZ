import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ArrowRight } from 'lucide-react-native';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { simplifyDebts, Transaction } from '../../utils/debtOptimizer';
import { Colors } from '../../theme/colors';

export default function DebtSummaryScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const [loading, setLoading] = useState(true);
  const [optimizedTransactions, setOptimizedTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<{name: string, net: number}[]>([]);

  useEffect(() => {
    calculateDebts();
  }, []);

  const calculateDebts = async () => {
    try {
      // 1. Lấy tất cả hóa đơn của nhóm
      const invoiceSnap = await getDocs(collection(db, 'groups', groupId, 'invoices'));
      const invoices = invoiceSnap.docs.map(doc => doc.data());

      // 2. Lấy tên tất cả thành viên để hiển thị
      const groupSnap = await getDoc(doc(db, 'groups', groupId));
      const memberIds = groupSnap.data()?.members || [];
      const memberNames: { [key: string]: string } = {};
      
      for (const id of memberIds) {
        const uSnap = await getDoc(doc(db, 'users', id));
        memberNames[id] = uSnap.data()?.name || (id === 'me' ? 'Bạn' : "Thành viên");
      }

      // 3. Tính Net Balance (Số dư ròng) của từng người
      // Net = (Tiền đã chi trả) - (Tiền bản thân phải chịu)
      const balancesMap: { [key: string]: { name: string, net: number } } = {};
      memberIds.forEach((id: string) => {
        balancesMap[id] = { name: memberNames[id], net: 0 };
      });

      invoices.forEach(inv => {
        const paidBy = inv.paidBy;
        const totalAmount = inv.amount;
        
        if (balancesMap[paidBy]) balancesMap[paidBy].net += totalAmount;

        if (inv.items && inv.items.length > 0) {
          inv.items.forEach((item: any) => {
            const shareAmount = item.price / item.sharedBy.length;
            item.sharedBy.forEach((uid: string) => {
              if (balancesMap[uid]) balancesMap[uid].net -= shareAmount;
            });
          });
        } else {
          const perPerson = totalAmount / memberIds.length;
          memberIds.forEach((id: string) => {
            if (balancesMap[id]) balancesMap[id].net -= perPerson;
          });
        }
      });

      // 4. Dùng thuật toán tối ưu để gom nợ
      const finalDebts = simplifyDebts(balancesMap);
      setOptimizedTransactions(finalDebts);
      
      const balanceArray = Object.values(balancesMap).sort((a, b) => b.net - a.net);
      setBalances(balanceArray);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderBalanceChart = () => {
    if (balances.length === 0) return null;
    const maxAbsNet = Math.max(...balances.map(b => Math.abs(b.net)));
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Số dư ròng (Net Balance)</Text>
        <Text style={styles.chartSubtitle}>Dương: Nhận lại tiền • Âm: Cần trả tiền</Text>
        
        {balances.map((b, index) => {
          const isPositive = b.net >= 0;
          const percentage = maxAbsNet > 0 ? (Math.abs(b.net) / maxAbsNet) * 100 : 0;
          const barWidth = `${Math.max(percentage, 5)}%`; // Min 5% so it's visible

          return (
            <View key={index} style={styles.balanceRow}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceName} numberOfLines={1}>{b.name}</Text>
                <Text style={[styles.balanceAmount, { color: isPositive ? Colors.success : Colors.danger }]}>
                  {isPositive ? '+' : ''}{b.net.toLocaleString()}đ
                </Text>
              </View>
              <View style={styles.barBackground}>
                <View style={[
                  styles.barFill, 
                  { 
                    width: barWidth as any, 
                    backgroundColor: isPositive ? Colors.success : Colors.danger,
                  }
                ]} />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft color="white" size={28} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo nợ nhóm</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderBalanceChart()}
          
          <View style={styles.transactionsContainer}>
            <Text style={styles.sectionTitle}>Phương án trả nợ tối ưu</Text>
            {optimizedTransactions.length === 0 ? (
              <Text style={styles.empty}>Mọi người đã hết nợ nhau!</Text>
            ) : (
              optimizedTransactions.map((item, index) => (
                <View key={index} style={styles.card}>
                  <View style={styles.person}>
                    <Text style={styles.name}>{item.fromName}</Text>
                    <Text style={styles.role}>Người trả</Text>
                  </View>
                  
                  <View style={styles.amountContainer}>
                    <ArrowRight color={Colors.primary} size={20} />
                    <Text style={styles.amount}>{item.amount.toLocaleString()}đ</Text>
                  </View>

                  <View style={styles.person}>
                    <Text style={[styles.name, { textAlign: 'right' }]}>{item.toName}</Text>
                    <Text style={[styles.role, { textAlign: 'right' }]}>Người nhận</Text>
                  </View>
                </View>
              ))
            )}
            
            {optimizedTransactions.length > 0 && (
              <TouchableOpacity style={styles.remindButton}>
                <Text style={styles.remindButtonText}>Gửi thông báo nhắc nợ</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#1e293b' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  chartContainer: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 24 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  chartSubtitle: { color: '#64748b', fontSize: 13, marginBottom: 20 },
  balanceRow: { marginBottom: 16 },
  balanceInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  balanceName: { color: 'white', fontSize: 15, fontWeight: '500', flex: 1 },
  balanceAmount: { fontSize: 15, fontWeight: 'bold' },
  barBackground: { height: 10, backgroundColor: '#334155', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  transactionsContainer: { paddingBottom: 40 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  person: { flex: 1 },
  name: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  role: { color: '#64748b', fontSize: 11, marginTop: 4 },
  amountContainer: { alignItems: 'center', flex: 1 },
  amount: { color: Colors.primary, fontWeight: 'bold', fontSize: 16, marginTop: 5 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 20 },
  remindButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  remindButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});