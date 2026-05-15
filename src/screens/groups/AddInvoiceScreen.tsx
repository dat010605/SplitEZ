import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Colors } from '../../theme/colors';
import { ChevronLeft, Receipt, DollarSign, Save, Camera, Image as ImageIcon, X, Check } from 'lucide-react-native';
import { auth, db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import * as ImagePicker from 'expo-image-picker';

interface Member {
  id: string;
  name: string;
}

interface InvoiceItem {
  id: string;
  name: string;
  price: number;
  sharedBy: string[];
}

export default function AddInvoiceScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const user = auth.currentUser;
  const addInvoiceLocal = useInvoiceStore(state => state.addInvoice);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const groupSnap = await getDoc(doc(db, 'groups', groupId));
      if (groupSnap.exists()) {
        const memberIds = groupSnap.data().members || [];
        const membersData: Member[] = [];
        for (const mId of memberIds) {
          const userSnap = await getDoc(doc(db, 'users', mId));
          if (userSnap.exists()) {
            membersData.push({ id: mId, name: userSnap.data().name });
          }
        }
        setGroupMembers(membersData);
      }
    } catch (error) { console.error(error); }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
      exif: false,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setBase64Image(result.assets[0].base64 || null);
    }
  };

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
      exif: false,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setBase64Image(result.assets[0].base64 || null);
    }
  };

  const processOCR = async () => {
    if (!base64Image) return;
    setLoading(true);
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      const prompt = "Đọc hóa đơn này và trả về JSON: {\"items\": [{\"name\": \"tên món\", \"price\": 50000}]}. Chỉ lấy các món lẻ.";
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Image } }] }]
        })
      });

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const cleanJson = responseText.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanJson);
        const formattedItems = result.items.map((item: any) => ({
          id: Math.random().toString(),
          name: item.name,
          price: item.price,
          sharedBy: groupMembers.map(m => m.id)
        }));
        setItems(formattedItems);
        const total = formattedItems.reduce((sum: number, item: any) => sum + item.price, 0);
        setAmount(total.toString());
      }
    } catch (error) {
      Alert.alert('Lỗi', 'AI không thể đọc ảnh này.');
    } finally { setLoading(false); }
  };

  const toggleMemberForItem = (itemId: string, memberId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const isShared = item.sharedBy.includes(memberId);
        return { ...item, sharedBy: isShared ? item.sharedBy.filter(id => id !== memberId) : [...item.sharedBy, memberId] };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!title || !amount) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'groups', groupId, 'invoices'), {
        groupId, title, amount: parseFloat(amount),
        paidBy: user?.uid, items: items, createdAt: serverTimestamp(),
      });
      navigation.goBack();
    } catch (error) { Alert.alert('Lỗi', 'Không thể lưu'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft color="white" size={28} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Chia tiền chi tiết</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!imageUri ? (
          <View style={styles.pickerContainer}>
            <TouchableOpacity style={styles.pickerButton} onPress={takePhoto}>
              <Camera color={Colors.primary} size={30} />
              <Text style={styles.pickerText}>Chụp ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickerButton, { marginLeft: 10 }]} onPress={pickImage}>
              <ImageIcon color={Colors.primary} size={30} />
              <Text style={styles.pickerText}>Chọn ảnh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewBox}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <TouchableOpacity style={styles.removeImg} onPress={() => {setImageUri(null); setItems([]);}}><X color="white" size={20} /></TouchableOpacity>
            <TouchableOpacity style={styles.ocrBtn} onPress={processOCR} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.ocrBtnText}>Quét hóa đơn</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Tên hóa đơn</Text>
          <View style={styles.inputWrap}>
            <Receipt color="#64748b" size={20} style={{marginRight: 10}} />
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Vd: Ăn lẩu..." placeholderTextColor="#475569" />
          </View>

          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{item.price.toLocaleString()}đ</Text>
              </View>
              <View style={styles.memberList}>
                {groupMembers.map(m => (
                  <TouchableOpacity key={m.id} style={[styles.chip, item.sharedBy.includes(m.id) && styles.chipActive]} onPress={() => toggleMemberForItem(item.id, m.id)}>
                    <Text style={[styles.chipText, item.sharedBy.includes(m.id) && {color: 'white'}]}>{m.name.split(' ').pop()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <Text style={styles.label}>Tổng tiền (đ)</Text>
          <View style={styles.inputWrap}>
            <DollarSign color="#64748b" size={20} style={{marginRight: 10}} />
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            <Text style={styles.saveBtnText}>Lưu & Tính Nợ</Text>
            <Save color="white" size={20} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#1e293b' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  pickerContainer: { flexDirection: 'row', marginBottom: 20 },
  pickerButton: { flex: 1, height: 100, borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  pickerText: { color: '#94a3b8', marginTop: 8, fontSize: 12 },
  previewBox: { height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  removeImg: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 },
  ocrBtn: { position: 'absolute', bottom: 15, alignSelf: 'center', backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  ocrBtnText: { color: 'white', fontWeight: 'bold' },
  form: { gap: 15 },
  label: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 15, borderRadius: 12, height: 50 },
  input: { flex: 1, color: 'white' },
  itemCard: { backgroundColor: '#1e293b', padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  itemName: { color: 'white', fontWeight: 'bold' },
  itemPrice: { color: Colors.primary, fontWeight: 'bold' },
  memberList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: '#94a3b8', fontSize: 11 },
  saveBtn: { backgroundColor: Colors.primary, height: 55, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});