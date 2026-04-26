import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { registerForPushNotificationsAsync } from '../utils/notifications';

const CITIES = ['Aurangabad', 'Nagpur', 'Pune', 'Nashik', 'Mumbai'];
const SKILLS = ['Mason', 'Electrician', 'Plumber', 'Domestic Help', 'Factory Worker', 'Carpenter', 'Painter', 'Driver'];

export default function EmployerRegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    city: 'Aurangabad',
    workerType: 'Mason',
    workerCount: '1'
  });
  const [loading, setLoading] = useState(false);
  const [modalType, setModalType] = useState(null);

  const handleRegister = async () => {
    if (!formData.name || formData.phone.length !== 10) {
      Alert.alert('Error', 'Please enter valid name and 10-digit phone number.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/auth/register-employer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          city: formData.city,
          companyName: formData.companyName
        })
      });

      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem('user', JSON.stringify({ ...data.user, token: data.token }));
        
        // Push Notification Setup
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await fetch(`${CONFIG.BACKEND_URL}/api/notifications/employers/${data.user.id}/push-token`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ push_token: pushToken })
            });
          }
        } catch (pushErr) {
          console.log('Push token registration failed:', pushErr);
        }

        Alert.alert('Success', 'Welcome to Kamgar Connect!', [{ text: 'OK', onPress: () => navigation.navigate('EmployerDashboard') }]);
      } else {
        Alert.alert('Error', data.msg || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network Error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPickerModal = () => (
    <Modal visible={!!modalType} transparent animationType="slide">
      <View style={styles.modalBg}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select {modalType === 'city' ? 'City' : 'Worker Type'}</Text>
          {(modalType === 'city' ? CITIES : SKILLS).map(item => (
            <TouchableOpacity 
              key={item} 
              style={styles.modalItem}
              onPress={() => {
                const key = modalType === 'city' ? 'city' : 'workerType';
                setFormData({ ...formData, [key]: item });
                setModalType(null);
              }}
            >
              <Text style={styles.modalItemText}>{item}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeBtn} onPress={() => setModalType(null)}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Employer Registration</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Anand Deshmukh" 
            placeholderTextColor="#666" 
            value={formData.name}
            onChangeText={t => setFormData({...formData, name: t})}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Company or House Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Sai Constructions" 
            placeholderTextColor="#666" 
            value={formData.companyName}
            onChangeText={t => setFormData({...formData, companyName: t})}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput 
            style={styles.input} 
            placeholder="10-digit mobile" 
            placeholderTextColor="#666" 
            keyboardType="number-pad"
            maxLength={10}
            value={formData.phone}
            onChangeText={t => setFormData({...formData, phone: t})}
          />
        </View>

        <TouchableOpacity style={styles.inputGroup} onPress={() => setModalType('city')}>
          <Text style={styles.label}>City</Text>
          <View style={styles.pickerTrigger}>
            <Text style={styles.pickerValue}>{formData.city}</Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.inputGroup} onPress={() => setModalType('skill')}>
          <Text style={styles.label}>What type of worker do you need?</Text>
          <View style={styles.pickerTrigger}>
            <Text style={styles.pickerValue}>{formData.workerType}</Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Number of Workers Needed</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 2" 
            placeholderTextColor="#666" 
            keyboardType="number-pad"
            value={formData.workerCount}
            onChangeText={t => setFormData({...formData, workerCount: t})}
          />
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>START HIRING</Text>}
        </TouchableOpacity>
      </ScrollView>
      {renderPickerModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scroll: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A3C6E',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#9CA3AF',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#FFF',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  pickerTrigger: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerValue: {
    color: '#FFF',
    fontSize: 16,
  },
  pickerArrow: {
    color: '#666',
  },
  submitBtn: {
    backgroundColor: '#1A3C6E',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    minHeight: 60,
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 1,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalItemText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
  },
  closeBtn: {
    marginTop: 20,
    padding: 15,
  },
  closeBtnText: {
    color: '#FF6B00',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});
