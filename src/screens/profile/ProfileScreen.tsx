import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';
import { Settings, LogOut, Bell, User, Camera, ChevronRight } from 'lucide-react-native';
import { auth } from '../../services/firebase';
import { signOut, updateProfile, updatePassword } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ navigation }: any) {
  const user = auth.currentUser;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng xuất', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error: any) {
              Alert.alert('Lỗi', error.message);
            }
          }
        },
      ]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Chúng tôi cần quyền truy cập thư viện ảnh!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && user) {
      setLoading(true);
      try {
        await updateProfile(user, { photoURL: result.assets[0].uri });
        Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện');
      } catch (error: any) {
        Alert.alert('Lỗi', error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditAccount = () => {
    navigation.navigate('Account Settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ</Text>
        <TouchableOpacity>
          <Settings color="white" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.userSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} disabled={loading}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Text style={styles.avatarText}>
                  {user?.displayName?.substring(0, 1).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              {loading ? <ActivityIndicator size="small" color="white" /> : <Camera color="white" size={16} />}
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.displayName || 'Người dùng SPLITEZ'}</Text>
          <Text style={styles.userPhone}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.profileItem} onPress={handleEditAccount}>
            <View style={styles.iconContainer}>
              <User color={Colors.dark.textSecondary} size={22} />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Tài khoản</Text>
              <Text style={styles.itemSubtitle}>{user?.displayName || 'Chưa thiết lập'}</Text>
            </View>
            <ChevronRight color={Colors.dark.border} size={20} />
          </TouchableOpacity>

          <View style={[styles.profileItem, styles.noBorder]}>
            <View style={styles.iconContainer}>
              <Bell color={Colors.dark.textSecondary} size={22} />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Thông báo</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#3e3e3e', true: Colors.primary }}
              thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={[styles.profileItem, styles.noBorder]} onPress={handleLogout}>
            <View style={styles.iconContainer}>
              <LogOut color={Colors.danger} size={22} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: Colors.danger }]}>Đăng xuất</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>SPLITEZ v1.0.0 (Telegram Style)</Text>
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
    backgroundColor: Colors.dark.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.dark.surface,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderAvatar: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
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
    borderColor: Colors.dark.surface,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  section: {
    marginTop: 20,
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: Colors.dark.border,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 40,
    marginRight: 4,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 17,
    color: 'white',
  },
  itemSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    marginTop: 40,
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginBottom: 40,
  },
});
