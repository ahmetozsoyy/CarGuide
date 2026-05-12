import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import VehicleDataRaw from '../../constants/VehicleData.json';

// Define the shape of our imported JSON
interface VehicleDataStructure {
  vites_tipi: string[];
  yakit_tipi: string[];
  marka: string[];
  marka_to_seri: Record<string, string[]>;
  seri_to_model: Record<string, string[]>;
}

const VehicleData = VehicleDataRaw as VehicleDataStructure;

export default function PriceAnalysisScreen() {
  const [marka, setMarka] = useState(VehicleData.marka[0] || '');
  const [seriList, setSeriList] = useState<string[]>([]);
  const [seri, setSeri] = useState('');
  
  const [modelList, setModelList] = useState<string[]>([]);
  const [model, setModel] = useState('');

  const [yakit, setYakit] = useState(VehicleData.yakit_tipi[0] || '');
  const [vites, setVites] = useState(VehicleData.vites_tipi[0] || '');
  const [yil, setYil] = useState('');
  const [km, setKm] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { token } = useAuth();

  // Update Seri list when Marka changes
  useEffect(() => {
    if (marka && VehicleData.marka_to_seri[marka]) {
      const seriesForMarka = VehicleData.marka_to_seri[marka] || [];
      setSeriList(seriesForMarka);
      setSeri(seriesForMarka[0] || '');
    } else {
      setSeriList([]);
      setSeri('');
    }
  }, [marka]);

  // Update Model list when Seri changes
  useEffect(() => {
    if (seri && VehicleData.seri_to_model[seri]) {
      const modelsForSeri = VehicleData.seri_to_model[seri] || [];
      setModelList(modelsForSeri);
      setModel(modelsForSeri[0] || '');
    } else {
      setModelList([]);
      setModel('');
    }
  }, [seri]);

  const handleAnalyze = async () => {
    if (!yil || !km) {
      alert("Lütfen Yıl ve Kilometre bilgilerini giriniz.");
      return;
    }
    
    setLoading(true);
    
    try {
      // Connect to the Python Flask backend
      // Replace this IP with your computer's local Wi-Fi IP (IPv4) if it's different.
      const response = await fetch('http://172.24.246.41:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          marka: marka,
          seri: seri,
          model: model,
          yil: yil,
          vites_tipi: vites,
          yakit_tipi: yakit,
          kilometre: km
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.formatted_price);
      } else {
        alert("Hata: " + (data.error || "Bir sorun oluştu"));
      }
    } catch (error) {
      console.error(error);
      alert("Sunucuya bağlanılamadı. Python API'nin çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Yapay Zeka Fiyat Analizi</Text>
      <Text style={styles.subtitle}>Aracınızın piyasa değerini anında öğrenin.</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Marka</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={marka}
            onValueChange={(itemValue) => setMarka(itemValue)}
            style={styles.picker}
            dropdownIconColor={Colors.text}
          >
            {VehicleData.marka.map((m: string) => <Picker.Item key={m} label={m} value={m} />)}
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Seri</Text>
        <View style={[styles.pickerContainer, seriList.length === 0 && styles.pickerDisabled]}>
          <Picker
            selectedValue={seri}
            onValueChange={(itemValue) => setSeri(itemValue)}
            style={styles.picker}
            dropdownIconColor={Colors.text}
            enabled={seriList.length > 0}
          >
            {seriList.length > 0 ? (
              seriList.map((s: string) => <Picker.Item key={s} label={s} value={s} />)
            ) : (
              <Picker.Item label="Seri bulunamadı" value="" />
            )}
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Model (Donanım/Paket)</Text>
        <View style={[styles.pickerContainer, modelList.length === 0 && styles.pickerDisabled]}>
          <Picker
            selectedValue={model}
            onValueChange={(itemValue) => setModel(itemValue)}
            style={styles.picker}
            dropdownIconColor={Colors.text}
            enabled={modelList.length > 0}
          >
            {modelList.length > 0 ? (
              modelList.map((m: string) => <Picker.Item key={m} label={m} value={m} />)
            ) : (
              <Picker.Item label="Model bulunamadı" value="" />
            )}
          </Picker>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>Yakıt Tipi</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={yakit} onValueChange={setYakit} style={styles.picker} dropdownIconColor={Colors.text}>
              {VehicleData.yakit_tipi.map((y: string) => <Picker.Item key={y} label={y} value={y} />)}
            </Picker>
          </View>
        </View>

        <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
          <Text style={styles.label}>Vites Tipi</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={vites} onValueChange={setVites} style={styles.picker} dropdownIconColor={Colors.text}>
              {VehicleData.vites_tipi.map((v: string) => <Picker.Item key={v} label={v} value={v} />)}
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>Yıl</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 2018"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            value={yil}
            onChangeText={setYil}
          />
        </View>

        <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
          <Text style={styles.label}>Kilometre</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 120000"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            value={km}
            onChangeText={setKm}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleAnalyze} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Analiz Et</Text>
        )}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Tahmini Piyasa Değeri</Text>
          <Text style={styles.resultValue}>{result}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 8,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  picker: {
    color: Colors.text,
    height: 50,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    height: 55,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  resultTitle: {
    color: Colors.textMuted,
    fontSize: 16,
    marginBottom: 8,
  },
  resultValue: {
    color: Colors.secondary,
    fontSize: 24,
    fontWeight: 'bold',
  },
});
