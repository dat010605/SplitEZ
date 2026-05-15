import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Colors } from '../../theme/colors';
import { ChevronLeft, Receipt, DollarSign, Save, Camera } from 'lucide-react-native';
import { auth, db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useInvoiceStore } from '../../store/useInvoiceStore';

export default function AddInvoiceScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const user = auth.currentUser;
  const addInvoiceLocal = useInvoiceStore(state => state.addInvoice);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !amount.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên hóa đơn và số tiền');
      return;
    }

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount)) {
      Alert.alert('Lỗi', 'Số tiền không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const invoiceData = {
        groupId,
        title: title.trim(),
        amount: totalAmount,
        paidBy: user?.uid,
        paidByName: user?.displayName || 'Thành viên',
        createdAt: serverTimestamp(),
      };

      // 1. Save to Firestore
      const docRef = await addDoc(collection(db, 'groups', groupId, 'invoices'), invoiceData);

      // 2. Save to local store
      addInvoiceLocal({
        id: docRef.id,
        ...invoiceData,
        date: new Date(),
      } as any);

      Alert.alert('Thành công', 'Đã thêm hóa đơn mới');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm hóa đơn</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.ocrPlaceholder}>
          <TouchableOpacity style={styles.ocrButton}>
            <Camera color={Colors.primary} size={32} />
            <Text style={styles.ocrText}>Quét hóa đơn (Sắp ra mắt)</Text>
          </TouchableOpacity>
          <Text style={styles.ocrHint}>Dành cho Thành viên 2 tích hợp OCR</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên hóa đơn</Text>
            <View style={styles.inputContainer}>
              <Receipt color={Colors.dark.textSecondary} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Ăn tối, Đi siêu thị..."
                placeholderTextColor={Colors.dark.textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số tiền (đ)</Text>
            <View style={styles.inputContainer}>
              <DollarSign color={Colors.dark.textSecondary} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.dark.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Mặc định: Bạn trả trước và chia đều cho cả nhóm.</Text>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.disabledButton]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Lưu hóa đơn</Text>
                <Save color="white" size={20} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: Colors.dark.surface,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 24,
  },
  ocrPlaceholder: {
    backgroundColor: 'rgba(36, 129, 204, 0.1)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginBottom: 32,
  },
  ocrButton: {
    alignItems: 'center',
    opacity: 0.6,
  },
  ocrText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 12,
  },
  ocrHint: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: 'white',
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
