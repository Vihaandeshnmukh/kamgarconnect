import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';

export default function JobDetailScreen({ route, navigation }) {
  const { job } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.jobType}>{job.jobType}</Text>
          <Text style={styles.amount}>₹{job.amount}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{job.city}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Workers Req:</Text>
            <Text style={styles.value}>{job.workerCount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Posted On:</Text>
            <Text style={styles.value}>{new Date(job.postedAt).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.desc}>
            This is a verified job posting from Kamgar Connect. The employer needs someone specialized in {job.jobType} to work in {job.city}. 
            Accepting this job will share your contact info with the employer.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={() => navigation.goBack()}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => { /* Accept logic */ }}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#1E1E1E',
    padding: 30,
    borderRadius: 24,
  },
  jobType: {
    color: '#FF6B00',
    fontSize: 32,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  amount: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FF6B00',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    color: '#9CA3AF',
    width: 100,
    fontSize: 16,
  },
  value: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  desc: {
    color: '#9CA3AF',
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: '#333',
  },
  acceptBtn: {
    backgroundColor: '#FF6B00',
  },
  declineText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  acceptText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
