import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'success';
  showCancel?: boolean;
}

export default function CustomAlert({ 
  visible, 
  title, 
  message, 
  onCancel, 
  onConfirm, 
  confirmText = 'Onayla', 
  cancelText = 'İptal',
  type = 'danger',
  showCancel = true
}: CustomAlertProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'danger': return { name: 'warning', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'info': return { name: 'information-circle', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'success': return { name: 'checkmark-circle', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      default: return { name: 'warning', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    }
  };

  const iconInfo = getIcon();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertCard}>
          <View style={[styles.iconContainer, { backgroundColor: iconInfo.bg }]}>
            <Ionicons name={iconInfo.name as any} size={32} color={iconInfo.color} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonRow}>
            {showCancel && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelBtnText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.confirmBtn, type === 'danger' && styles.confirmBtnDanger]} 
              onPress={onConfirm}
            >
              <Text style={[styles.confirmBtnText, type === 'danger' && styles.confirmBtnTextDanger]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.4)',
  },
  confirmBtnText: {
    color: '#818CF8',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  confirmBtnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  confirmBtnTextDanger: {
    color: '#EF4444',
  },
});
