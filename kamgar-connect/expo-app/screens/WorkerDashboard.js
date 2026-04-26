import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import JobCard from '../components/JobCard';

export default function WorkerDashboard({ navigation }) {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      setUser(u);
      fetchJobs(u.city);
    }
  };

  const fetchJobs = async (city) => {
    setLoading(true);
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/jobs/available/${city}`);
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (user) fetchJobs(user.city);
  }, [user]);

  const handleAccept = async (jobId) => {
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/jobs/${jobId}/accept`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        const lang = await AsyncStorage.getItem('lang');
        let msg = 'Job accepted! The employer will call you shortly.';
        if (lang === 'hi') msg = 'Job mil gaya! Employer aapko call karenge.';
        if (lang === 'mr') msg = 'Nondani zali! Employer tumhala call kartil.';
        
        Alert.alert('Success', msg);
        onRefresh();
      } else {
        Alert.alert('Error', data.msg || 'Failed to accept job');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.navigate('Splash');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{user?.name}!</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.iconCircle}><Text style={styles.iconBtn}>👤</Text></View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <View style={[styles.iconCircle, { marginLeft: 10 }]}><Text style={styles.iconBtn}>🚪</Text></View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Available Jobs in {user?.city}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6B00" style={styles.loader} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item._id}
          renderItem={({ item }) => <JobCard job={item} onAccept={handleAccept} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No jobs available in your city yet.</Text>
              <Text style={styles.emptySub}>Check back later or try refreshing.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerRight: {
    flexDirection: 'row',
  },
  greeting: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  iconCircle: {
    backgroundColor: '#333',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: {
    fontSize: 18,
  },
  listHeader: {
    padding: 20,
  },
  listTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  loader: {
    marginTop: 50,
  },
  empty: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySub: {
    color: '#9CA3AF',
    marginTop: 5,
  },
});
