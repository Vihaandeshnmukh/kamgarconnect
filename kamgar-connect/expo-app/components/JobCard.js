import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

export default function JobCard({ job, onAccept }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.jobType}>{job.jobType}</Text>
        <Text style={styles.amount}>₹{job.amount}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.label}>Location:</Text>
        <Text style={styles.value}>{job.city}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{new Date(job.postedAt).toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.label}>Workers Needed:</Text>
        <Text style={styles.value}>{job.workerCount}</Text>
      </View>

      <TouchableOpacity style={styles.btn} onPress={() => onAccept(job._id)}>
        <Text style={styles.btnText}>Accept Job</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  jobType: {
    color: '#FF6B00',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  amount: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    color: '#9CA3AF',
    width: 120,
    fontSize: 14,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  btn: {
    backgroundColor: '#FF6B00',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  btnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
