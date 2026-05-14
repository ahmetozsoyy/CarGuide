import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Animated, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import CustomAlert from '../../components/CustomAlert';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'danger' as 'danger' | 'info' | 'success', onConfirm: () => {} });

  const showAlert = (title: string, message: string, type: 'danger' | 'info' | 'success' = 'danger', onConfirm?: () => void) => {
    setAlertConfig({ title, message, type, onConfirm: onConfirm || (() => setAlertVisible(false)) });
    setAlertVisible(true);
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) { showAlert("Hata", "Lütfen tüm alanları doldurun.", "danger"); return; }
    if (password !== confirmPassword) { showAlert("Hata", "Şifreler eşleşmiyor.", "danger"); return; }
    setLoading(true);
    try {
      const response = await fetch('http://172.24.246.41:5000/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      if (data.success) { 
        showAlert("Başarılı", "Kayıt başarılı! Lütfen giriş yapın.", "success", () => {
          setAlertVisible(false);
          router.replace('/(auth)/login');
        }); 
      }
      else { showAlert("Hata", data.error || "Kayıt olunamadı.", "danger"); }
    } catch (error) { showAlert("Hata", "Sunucuya bağlanılamadı.", "danger"); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0E17', '#141922', '#1C2333']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', alignItems: 'center' }}>
            <View style={styles.logoArea}>
              <View style={styles.logoFrame}>
                <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="cover" />
              </View>
              <Text style={styles.brand}>Kayıt Ol</Text>
              <Text style={styles.tagline}>Yeni bir hesap oluşturun</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Ad Soyad" placeholderTextColor={Colors.textMuted}
                  value={name} onChangeText={setName} autoCapitalize="words" />
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="E-posta" placeholderTextColor={Colors.textMuted}
                  value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Şifre" placeholderTextColor={Colors.textMuted}
                  value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 8 }}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Şifreyi Onayla" placeholderTextColor={Colors.textMuted}
                  value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPw} />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 8 }}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
                <LinearGradient colors={[...Colors.gradientPrimary]} style={styles.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.buttonText}>{loading ? 'Kaydediliyor...' : 'Kayıt Ol'}</Text>
                  {!loading && <Ionicons name="checkmark-circle" size={20} color="#FFF" />}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
              <TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>Giriş Yap</Text></TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        showCancel={false}
        confirmText="Tamam"
        onCancel={() => setAlertVisible(false)}
        onConfirm={alertConfig.onConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoFrame: { 
    width: 100, 
    height: 100, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#6366F1', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 15,
    elevation: 10,
    overflow: 'hidden'
  },
  logoImage: { width: '100%', height: '100%' },
  brand: { fontSize: 30, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: Colors.textMuted, marginTop: 6 },
  form: { width: '100%', gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: Colors.text, fontSize: 16, paddingVertical: 18 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 18, marginTop: 8 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', marginTop: 32 },
  footerText: { color: Colors.textMuted, fontSize: 14 },
  link: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700' },
});
