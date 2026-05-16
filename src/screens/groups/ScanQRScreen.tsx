import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Colors } from '../../theme/colors';
import { ChevronLeft } from 'lucide-react-native';
import { useGroupStore } from '../../store/useGroupStore';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';

export default function ScanQRScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  
  const groups = useGroupStore((state) => state.groups);
  // Optional: add a function to update group members if you have one in your store
  // const updateGroup = useGroupStore((state) => state.updateGroup); 

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    setScanned(true);
    
    try {
      // Tìm nhóm trên Firebase bằng inviteCode
      const q = query(collection(db, 'groups'), where('inviteCode', '==', data));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const groupDoc = querySnapshot.docs[0];
        const groupData = groupDoc.data();
        const groupId = groupDoc.id;

        Alert.alert(
          'Tham gia nhóm',
          `Bạn có muốn tham gia nhóm "${groupData.name}" không?`,
          [
            { text: 'Hủy', onPress: () => setScanned(false), style: 'cancel' },
            { 
              text: 'Tham gia', 
              onPress: async () => {
                if (auth.currentUser) {
                  // Cập nhật Firebase
                  await updateDoc(doc(db, 'groups', groupId), {
                    members: arrayUnion(auth.currentUser.uid)
                  });
                  Alert.alert('Thành công', 'Đã tham gia nhóm!');
                  navigation.replace('Group Detail', { groupId: groupId });
                } else {
                  Alert.alert('Lỗi', 'Bạn chưa đăng nhập');
                  setScanned(false);
                }
              } 
            }
          ]
        );
      } else {
        Alert.alert(
          'Không tìm thấy', 
          `Không tìm thấy nhóm nào có mã mời: ${data}. Vui lòng thử lại.`,
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tìm nhóm');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return <Text style={styles.centerText}>Đang yêu cầu quyền sử dụng Camera...</Text>;
  }
  if (hasPermission === false) {
    return <Text style={styles.centerText}>Không có quyền truy cập Camera</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quét mã QR</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
          <Text style={styles.helpText}>Hướng Camera vào mã QR của nhóm</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: 'white',
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1e293b',
    zIndex: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 4,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
    borderRadius: 20,
    marginBottom: 20,
  },
  helpText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  }
});
