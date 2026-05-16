import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, Image } from 'react-native';
import { Colors } from '../../theme/colors';
import { Users, ChevronLeft, Save, Camera } from 'lucide-react-native';
import { useGroupStore } from '../../store/useGroupStore';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function CreateGroupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Chúng tôi cần quyền truy cập thư viện ảnh để đổi ảnh nhóm!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Lỗi', 'Bạn chưa đăng nhập');
      return;
    }

    setLoading(true);

    try {
      const groupId = Math.random().toString(36).substring(7);
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const userId = auth.currentUser.uid;

      const newGroup = {
        id: groupId,
        name,
        description,
        imageUri: imageUri || null,
        createdBy: userId,
        members: [userId],
        inviteCode: inviteCode,
        createdAt: serverTimestamp(),
      };

      // Save to Firebase (this will trigger onSnapshot in GroupListScreen)
      await setDoc(doc(db, 'groups', groupId), newGroup);
      
      navigation.goBack();
    } catch (error) {
      console.error("Error creating group: ", error);
      Alert.alert('Lỗi', 'Không thể tạo nhóm lúc này');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={Colors.dark.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhóm mới</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.iconCircle}>
                <Users color="white" size={40} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Camera color="white" size={16} />
            </View>
          </TouchableOpacity>
          <Text style={styles.iconLabel}>Nhấn để đổi ảnh nhóm</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên nhóm</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Đi du lịch, Phòng trọ, v.v."
              placeholderTextColor={Colors.dark.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mô tả (Tùy chọn)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Nhóm này dùng để làm gì?"
              placeholderTextColor={Colors.dark.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity style={styles.createButton} onPress={handleCreate} disabled={loading}>
            <Text style={styles.createButtonText}>{loading ? 'Đang tạo...' : 'Tạo nhóm'}</Text>
            {!loading && <Save color="white" size={20} />}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  content: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imagePicker: {
    position: 'relative',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.background,
  },
  iconLabel: {
    marginTop: 12,
    color: Colors.primary,
    fontWeight: 'bold',
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
  },
  input: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.dark.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
