import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Colors } from '../../theme/colors';
import { ChevronLeft, User, Lock, Save, Key } from 'lucide-react-native';
import { auth } from '../../services/firebase';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

export default function AccountSettingsScreen({ navigation }: any) {
  const user = auth.currentUser;
  const [name, setName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Tên không được để trống');
      return;
    }

    setLoading(true);
    try {
      // If changing password, must provide current password and it must be re-authenticated
      if (newPassword) {
        if (!currentPassword) {
          Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu cũ để thay đổi mật khẩu mới');
          setLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
          setLoading(false);
          return;
        }

        // Re-authenticate user
        const credential = EmailAuthProvider.credential(user!.email!, currentPassword);
        await reauthenticateWithCredential(user!, credential);
        
        // Update Password
        await updatePassword(user!, newPassword);
      }

      // Update Name if changed
      if (name !== user?.displayName) {
        await updateProfile(user!, { displayName: name });
      }

      Alert.alert('Thành công', 'Thông tin tài khoản đã được cập nhật');
      navigation.goBack();
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Lỗi', 'Mật khẩu cũ không chính xác');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Lỗi bảo mật', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
      } else {
        Alert.alert('Lỗi', error.message);
      }
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
        <Text style={styles.headerTitle}>Cài đặt tài khoản</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            <View style={styles.inputContainer}>
              <User color={Colors.dark.textSecondary} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tên hiển thị"
                placeholderTextColor={Colors.dark.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
            <Text style={styles.helperText}>Email: {user?.email}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>
            
            <View style={styles.inputContainer}>
              <Key color={Colors.dark.textSecondary} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu cũ"
                placeholderTextColor={Colors.dark.textSecondary}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
            </View>

            <View style={[styles.inputContainer, { marginTop: 12 }]}>
              <Lock color={Colors.dark.textSecondary} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu mới"
                placeholderTextColor={Colors.dark.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <View style={[styles.inputContainer, { marginTop: 12 }]}>
              <Lock color={Colors.dark.textSecondary} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Xác nhận mật khẩu mới"
                placeholderTextColor={Colors.dark.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
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
                <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                <Save color="white" size={20} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  helperText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 8,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
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
