import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen({ navigation }) {
  const selectLang = async (lang) => {
    await AsyncStorage.setItem('lang', lang);
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Kamgar<Text style={styles.logoHighlight}>Connect</Text></Text>
          <Text style={styles.welcomeText}>Select Language / भाषा निवडा</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.langButton} onPress={() => selectLang('en')}>
            <Text style={styles.emoji}>🇬🇧</Text>
            <View>
              <Text style={styles.btnText}>English</Text>
              <Text style={styles.subText}>Welcome to Kamgar Connect</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.langButton} onPress={() => selectLang('mr')}>
            <Text style={styles.emoji}>🟠</Text>
            <View>
              <Text style={styles.btnText}>मराठी</Text>
              <Text style={styles.subText}>कामगार कनेक्टमध्ये आपले स्वागत आहे</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.langButton} onPress={() => selectLang('hi')}>
            <Text style={styles.emoji}>🇮🇳</Text>
            <View>
              <Text style={styles.btnText}>हिंदी</Text>
              <Text style={styles.subText}>कामगार कनेक्ट में आपका स्वागत है</Text>
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logoHighlight: {
    color: '#FF6B00',
  },
  welcomeText: {
    color: '#9CA3AF',
    marginTop: 15,
    fontSize: 16,
  },
  buttonContainer: {
    gap: 20,
  },
  langButton: {
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 80,
  },
  emoji: {
    fontSize: 32,
    marginRight: 20,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  subText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
});
