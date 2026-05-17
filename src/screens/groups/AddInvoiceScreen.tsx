import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Colors } from '../../theme/colors';
import { ChevronLeft, Receipt, DollarSign, Save, Camera, Image as ImageIcon, X, Check } from 'lucide-react-native';
import { auth, db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import * as ImagePicker from 'expo-image-picker';
import { sendPushNotification } from '../../services/notifications';

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
      quality: 0.5,
      base64: true,
      exif: false,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const base64 = result.assets[0].base64 || null;
      setImageUri(uri);
      setBase64Image(base64);
      if (base64) {
        processOCR(base64);
      }
    }
  };

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
      base64: true,
      exif: false,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const base64 = result.assets[0].base64 || null;
      setImageUri(uri);
      setBase64Image(base64);
      if (base64) {
        processOCR(base64);
      }
    }
  };

  const processOCR = async (directBase64?: string) => {
    const imgData = directBase64 || base64Image;
    if (!imgData) return;
    setLoading(true);
    try {
      // BƯỚC 1: Dùng OCR.space để lấy chữ từ ảnh
      console.log("Đang quét chữ bằng OCR.space...");
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${imgData}`);
      formData.append('apikey', 'K82361817488957'); 
      formData.append('language', 'vie');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');

      const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData
      });
      const ocrResult = await ocrResponse.json();
      
      if (ocrResult.OCRExitCode !== 1) {
        // Gửi toàn bộ phản hồi lỗi lên Firestore để debug
        await addDoc(collection(db, 'debug_logs'), {
          error: "OCR.space Error",
          ocrResult: JSON.stringify(ocrResult),
          timestamp: serverTimestamp(),
          device: 'Android APK'
        });
        throw new Error(ocrResult.ErrorMessage || "Máy chủ OCR từ chối xử lý ảnh");
      }

      const rawText = ocrResult.ParsedResults?.[0]?.ParsedText;
      if (!rawText) throw new Error("Không tìm thấy chữ trong ảnh");

      console.log("Chữ đã quét được:", rawText);

      // BƯỚC 2: Dùng Gemini để sắp xếp lại chữ thành JSON (chỉ gửi text nên cực nhẹ)
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Thiếu Gemini API Key");

      const prompt = `Đây là nội dung quét từ một hóa đơn: "${rawText}". 
      Hãy trích xuất danh sách các món đồ và giá tiền. 
      CHỈ trả về JSON theo cấu trúc: {"items": [{"name": "tên món", "price": 50000}]}. 
      Giá tiền phải là số nguyên. Không thêm văn bản khác.`;

      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const aiData = await aiResponse.json();
      let responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      let finalItems = [];

      if (responseText) {
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const cleanJson = jsonMatch ? jsonMatch[0] : responseText.replace(/```json|```/g, '').trim();
          const result = JSON.parse(cleanJson);
          if (result.items && Array.isArray(result.items)) {
            finalItems = result.items;
          }
        } catch (e) {
          console.log("AI Parse error, falling back to Regex");
        }
      }

      // BƯỚC 3: Nếu AI thất bại, dùng Regex để tự lọc (Dự phòng)
      if (finalItems.length === 0) {
        console.log("Sử dụng Regex dự phòng...");
        const lines = rawText.split('\n');
        for (let line of lines) {
          // Tìm các dòng có dạng: Tên món ... [Số tiền]
          const match = line.match(/^(.+?)\s+([\d.,]{4,})\s*$/);
          if (match) {
            const name = match[1].trim();
            const price = parseInt(match[2].replace(/[.,]/g, ''));
            if (price > 1000) { // Chỉ lấy các món > 1000đ để tránh lấy nhầm số lượng
              finalItems.push({ name, price });
            }
          }
        }
      }

      if (finalItems.length > 0) {
        const formattedItems = finalItems.map((item: any) => ({
          id: Math.random().toString(),
          name: item.name || 'Món không tên',
          price: Number(item.price) || 0,
          sharedBy: groupMembers.map(m => m.id)
        }));
        setItems(formattedItems);
        const total = formattedItems.reduce((sum: number, item: any) => sum + item.price, 0);
        setAmount(total.toString());
      } else {
        Alert.alert('Kết quả quét', `Đã đọc được chữ nhưng không tách được món ăn. Nội dung đọc được:\n\n${rawText.substring(0, 200)}...`);
      }
    } catch (error: any) {
      console.log("OCR Error:", error);
      // Tự động gửi lỗi lên Firestore để mình (AI) kiểm tra
      try {
        await addDoc(collection(db, 'debug_logs'), {
          error: error.message || 'Unknown error',
          stack: error.stack || '',
          timestamp: serverTimestamp(),
          device: 'Android APK'
        });
      } catch (e) { console.log("Không thể gửi log lỗi"); }

      Alert.alert('Lỗi quét hóa đơn', `Chi tiết: ${error.message}. Bạn có thể thử nhập tay hóa đơn.`);
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
      
      // Gửi thông báo cho các thành viên khác trong nhóm
      try {
        const groupSnap = await getDoc(doc(db, 'groups', groupId));
        if (groupSnap.exists()) {
          const groupData = groupSnap.data();
          const memberIds = groupData.members || [];
          const groupName = groupData.name || 'Nhóm';
          
          for (const mId of memberIds) {
            if (mId !== user?.uid) {
              const userSnap = await getDoc(doc(db, 'users', mId));
              if (userSnap.exists()) {
                const userData = userSnap.data();
                const pushToken = userData.pushToken;
                const notificationsEnabled = userData.notificationsEnabled !== false;
                
                if (pushToken && notificationsEnabled) {
                  console.log(`Đang gửi thông báo tới token: ${pushToken}`);
                  await sendPushNotification(
                    pushToken,
                    `🧾 Hóa đơn mới: ${groupName}`,
                    `Một hóa đơn mới "${title}" trị giá ${parseFloat(amount).toLocaleString()}đ vừa được thêm vào nhóm.`,
                    { groupId }
                  );
                } else {
                  console.log(`Không gửi thông báo cho ${mId}: token=${!!pushToken}, enabled=${notificationsEnabled}`);
                }
              }
            }
          }
        }
      } catch (err) {
        console.log('Lỗi gửi thông báo:', err);
      }

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
            <TouchableOpacity style={styles.ocrBtn} onPress={() => processOCR()} disabled={loading}>
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
            // @ts-ignore - React 19 type issue with View key
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