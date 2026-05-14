import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface CustomPickerProps {
  value: string;
  onValueChange: (val: string) => void;
  items: string[];
  enabled?: boolean;
  placeholder?: string;
}

export default function CustomPicker({ value, onValueChange, items, enabled = true, placeholder = 'Seçiniz' }: CustomPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (item: string) => {
    onValueChange(item);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.trigger, !enabled && styles.disabled]} 
        onPress={() => enabled && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !value && { color: '#94A3B8' }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#94A3B8" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          </TouchableOpacity>
          
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={items}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.option, value === item && styles.optionSelected]} 
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.optionText, value === item && styles.optionTextSelected]}>
                    {item}
                  </Text>
                  {value === item && <Ionicons name="checkmark" size={22} color="#818CF8" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 56,
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  triggerText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    flex: 1,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  optionSelected: {
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    borderRadius: 12,
    borderBottomWidth: 0,
  },
  optionText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
  },
  optionTextSelected: {
    color: '#818CF8',
    fontFamily: 'Poppins_700Bold',
  },
});
