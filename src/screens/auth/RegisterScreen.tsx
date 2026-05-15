import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';
import { UserPlus, ArrowLeft } from 'lucide-react-native';
import { auth, db } from '../../services/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, { displayName: name });

      // Save user info to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: name,
        email: email,
        createdAt: new Date(),
      });

      Alert.alert('Thành công', 'Tài khoản của bạn đã được tạo!');
    } catch (error: any) {
      let errorMessage = 'Đã có lỗi xảy ra khi đăng ký.';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'Email này đã được sử dụng.';
      if (error.code === 'auth/invalid-email') errorMessage = 'Email không hợp lệ.';
      if (error.code === 'auth/weak-password') errorMessage = 'Mật khẩu quá yếu.';
      
      Alert.alert('Lỗi đăng ký', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <ArrowLeft color={Colors.dark.text} size={24} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Tham gia SplitEZ và bắt đầu chia sẻ chi tiêu thông minh</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và Tên</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Nguyễn Văn A"
              placeholderTextColor={Colors.dark.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Địa chỉ Email</Text>
            <TextInput
              style={styles.input}
              placeholder="example@mail.com"
              placeholderTextColor={Colors.dark.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              placeholder="Tối thiểu 6 ký tự"
              placeholderTextColor={Colors.dark.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>Đăng ký ngay</Text>
                <UserPlus color="white" size={20} />
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
  backButton: {
    padding: 16,
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
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
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
