import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ChevronLeft, ArrowRight, Wallet } from 'lucide-react-native';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { simplifyDebts, Transaction } from '../../utils/debtOptimizer';
import { Colors } from '../../theme/colors';

export default function DebtSummaryScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const [loading, setLoading] = useState(true);
  const [optimizedTransactions, setOptimizedTransactions] = useState<Transaction[]>([]);

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
        memberNames[id] = uSnap.data()?.name || "Thành viên";
      }

      // 3. Tính Net Balance (Số dư ròng) của từng người
      // Net = (Tiền đã chi trả) - (Tiền bản thân phải chịu)
      const balances: { [key: string]: { name: string, net: number } } = {};
      memberIds.forEach((id: string) => {
        balances[id] = { name: memberNames[id], net: 0 };
      });

      invoices.forEach(inv => {
        const paidBy = inv.paidBy;
        const totalAmount = inv.amount;
        
        // Cộng tiền cho người đã trả
        if (balances[paidBy]) balances[paidBy].net += totalAmount;

        // Trừ tiền cho những người tham gia ăn (chia đều hoặc theo món)
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach((item: any) => {
            const shareAmount = item.price / item.sharedBy.length;
            item.sharedBy.forEach((uid: string) => {
              if (balances[uid]) balances[uid].net -= shareAmount;
            });
          });
        } else {
          // Nếu hóa đơn không có item lẻ, chia đều tổng tiền cho cả nhóm
          const perPerson = totalAmount / memberIds.length;
          memberIds.forEach((id: string) => {
            if (balances[id]) balances[id].net -= perPerson;
          });
        }
      });

      // 4. Dùng thuật toán tối ưu để gom nợ
      const finalDebts = simplifyDebts(balances);
      setOptimizedTransactions(finalDebts);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft color="white" size={28} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Tổng kết nợ nhóm</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={optimizedTransactions}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>Mọi người đã hết nợ nhau!</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
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
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#1e293b' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  person: { flex: 1 },
  name: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  role: { color: '#64748b', fontSize: 11, marginTop: 4 },
  amountContainer: { alignItems: 'center', flex: 1 },
  amount: { color: Colors.primary, fontWeight: 'bold', fontSize: 16, marginTop: 5 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 50 }
});