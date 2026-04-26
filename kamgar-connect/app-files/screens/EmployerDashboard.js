import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import WorkerCard from '../components/WorkerCard';

const CITIES = ['Aurangabad', 'Nagpur', 'Pune', 'Nashik', 'Mumbai'];
const SKILLS = ['Mason', 'Electrician', 'Plumber', 'Domestic Help', 'Factory Worker', 'Carpenter', 'Painter', 'Driver'];

export default function EmployerDashboard({ navigation }) {
  const [user, setUser] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({ city: 'Aurangabad', skill: 'Mason' });
  const [modalType, setModalType] = useState(null); // 'city', 'skill', 'postJob'
  const [jobForm, setJobForm] = useState({ jobType: 'Mason', city: 'Aurangabad', workerCount: '1', amount: '500' });

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
      setFilters(f => ({ ...f, city: u.city }));
      fetchWorkers(u.city, filters.skill);
    }
  };

  const fetchWorkers = async (city, skill) => {
    setLoading(true);
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/workers/available/${city}/${skill}`);
      const data = await response.json();
      setWorkers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWorkers(filters.city, filters.skill);
  }, [filters]);

  const handleHire = async (worker) => {
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/calls/assign-job`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          workerId: worker._id,
          employerId: user._id,
          location: filters.city,
          date: new Date()
        })
      });
      if (response.ok) {
        Alert.alert('Hiring Success', `We are calling ${worker.name} now. Please wait for her/his response.`);
      } else {
        Alert.alert('Error', 'Failed to assign job');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handlePostJob = async () => {
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/jobs/post`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(jobForm)
      });
      if (response.ok) {
        Alert.alert('Success', 'Job posted successfully!');
        setModalType(null);
      } else {
        Alert.alert('Error', 'Failed to post job');
      }
    } catch (error) {
       Alert.alert('Error', 'Network error');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.navigate('Splash');
  };

  const renderPickerModal = () => (
    <Modal visible={modalType && modalType !== 'postJob'} transparent animationType="slide">
      <View style={styles.modalBg}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select {modalType === 'city' ? 'City' : 'Skill'}</Text>
          {(modalType === 'city' ? CITIES : SKILLS).map(item => (
            <TouchableOpacity 
              key={item} 
              style={styles.modalItem}
              onPress={() => {
                const newFilters = { ...filters, [modalType]: item };
                setFilters(newFilters);
                setModalType(null);
                fetchWorkers(newFilters.city, newFilters.skill);
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

  const renderPostJobModal = () => (
    <Modal visible={modalType === 'postJob'} transparent animationType="fade">
      <View style={styles.modalBgCenter}>
        <View style={styles.postJobModal}>
          <Text style={styles.modalTitle}>Post New Job</Text>
          
          <Text style={styles.label}>Skill Needed</Text>
          <TextInput 
            style={styles.input} 
            value={jobForm.jobType}
            onChangeText={t => setJobForm({...jobForm, jobType: t})}
          />

          <Text style={styles.label}>Location</Text>
          <TextInput 
            style={styles.input} 
            value={jobForm.city}
            onChangeText={t => setJobForm({...jobForm, city: t})}
          />

          <View style={styles.row}>
            <View style={{flex: 1}}>
              <Text style={styles.label}>Workers</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="number-pad" 
                value={jobForm.workerCount}
                onChangeText={t => setJobForm({...jobForm, workerCount: t})}
              />
            </View>
            <View style={{flex: 1, marginLeft: 10}}>
              <Text style={styles.label}>Pay (₹/day)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="number-pad" 
                value={jobForm.amount}
                onChangeText={t => setJobForm({...jobForm, amount: t})}
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalType(null)}>
              <Text style={styles.cancelBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handlePostJob}>
              <Text style={styles.confirmBtnText}>POST</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.postBtn} onPress={() => setModalType('postJob')}>
          <Text style={styles.postBtnText}>+ Post New Job</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterItem} onPress={() => setModalType('city')}>
          <Text style={styles.filterLabel}>City</Text>
          <Text style={styles.filterValue}>{filters.city} ▼</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterItem} onPress={() => setModalType('skill')}>
          <Text style={styles.filterLabel}>Skill</Text>
          <Text style={styles.filterValue}>{filters.skill} ▼</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1A3C6E" style={styles.loader} />
      ) : (
        <FlatList
          data={workers}
          keyExtractor={item => item._id}
          renderItem={({ item }) => <WorkerCard worker={item} onHire={handleHire} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3C6E" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No available {filters.skill}s in {filters.city}.</Text>
              <Text style={styles.emptySub}>Try changing filters or pull to refresh.</Text>
            </View>
          }
        />
      )}
      
      {renderPickerModal()}
      {renderPostJobModal()}
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
  actionRow: {
    padding: 20,
  },
  postBtn: {
    backgroundColor: '#1A3C6E',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  postBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 15,
  },
  filterItem: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 2,
  },
  filterValue: {
    color: '#FFF',
    fontSize: 14,
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
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalBgCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
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
    color: '#1A3C6E',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  postJobModal: {
    backgroundColor: '#1E1E1E',
    padding: 25,
    borderRadius: 24,
  },
  label: {
    color: '#9CA3AF',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#333',
    color: '#FFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 15,
  },
  modalBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#333',
  },
  confirmBtn: {
    backgroundColor: '#1A3C6E',
  },
  cancelBtnText: {
    color: '#FFF',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  }
});
