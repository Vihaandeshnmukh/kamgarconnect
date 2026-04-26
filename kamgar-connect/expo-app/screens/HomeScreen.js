import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    setLoading(false);
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role === 'worker') {
        navigation.navigate('WorkerDashboard');
      } else {
        navigation.navigate('EmployerDashboard');
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Kamgar<Text style={styles.logoHighlight}>Connect</Text></Text>
          <Text style={styles.tagline}>Dignity for workers. Ease for employers.</Text>
        </View>

        <View style={styles.cardContainer}>
          <TouchableOpacity 
            style={[styles.card, styles.workerCard]} 
            onPress={() => navigation.navigate('WorkerRegister')}
          >
            <Text style={styles.cardTitle}>I Need Work</Text>
            <Text style={styles.cardSub}>मजदूर साइनअप / कामगार नोंदणी</Text>
            <View style={styles.arrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, styles.employerCard]} 
            onPress={() => navigation.navigate('EmployerRegister')}
          >
            <Text style={styles.cardTitle}>I Need a Worker</Text>
            <Text style={styles.cardSub}>नियोक्ता साइनअप / मालक नोंदणी</Text>
            <View style={styles.arrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logoHighlight: {
    color: '#FF6B00',
  },
  tagline: {
    color: '#9CA3AF',
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  cardContainer: {
    gap: 25,
  },
  card: {
    borderRadius: 24,
    padding: 30,
    minHeight: 180,
    justifyContent: 'center',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  workerCard: {
    backgroundColor: '#FF6B00',
  },
  employerCard: {
    backgroundColor: '#1A3C6E',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardSub: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 5,
  },
  arrow: {
    position: 'absolute',
    right: 30,
    bottom: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 30,
    color: '#FFFFFF',
    marginTop: -4,
  },
});
