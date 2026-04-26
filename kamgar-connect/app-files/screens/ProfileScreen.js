import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.navigate('Splash');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone Number</Text>
            <Text style={styles.value}>{user?.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>City</Text>
            <Text style={styles.value}>{user?.city}</Text>
          </View>
          {user?.role === 'worker' && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Skill</Text>
                <Text style={styles.value}>{user?.skill}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Experience</Text>
                <Text style={styles.value}>{user?.experience} Years</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Expected Salary</Text>
                <Text style={styles.value}>₹{user?.salary || '500'}/day</Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity 
          style={styles.editBtn} 
          onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available in the next update.')}
        >
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: 40,
  },
  avatar: {
    backgroundColor: '#FF6B00',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: '800',
  },
  name: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },
  role: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    letterSpacing: 2,
  },
  infoSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 25,
    marginBottom: 30,
  },
  infoRow: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 15,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 5,
  },
  value: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  editBtn: {
    backgroundColor: '#333',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 15,
  },
  editBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  logoutBtn: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
});
