import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import StarRating from './StarRating';

export default function WorkerCard({ worker, onHire }) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{worker.name.charAt(0)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{worker.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{worker.skill}</Text>
          </View>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price}>₹{worker.salary || 500}</Text>
          <Text style={styles.unit}>/day</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Exp:</Text>
          <Text style={styles.statValue}>{worker.experience} yrs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Rating:</Text>
          <StarRating rating={worker.rating || 4.5} />
        </View>
      </View>

      <TouchableOpacity style={styles.hireBtn} onPress={() => onHire(worker)}>
        <Text style={styles.hireBtnText}>HIRE NOW</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    backgroundColor: '#1A3C6E',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  name: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: 'rgba(255,107,0,0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  badgeText: {
    color: '#FF6B00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  price: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  unit: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
    marginBottom: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginRight: 5,
  },
  statValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  hireBtn: {
    backgroundColor: '#1A3C6E',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  hireBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
});
