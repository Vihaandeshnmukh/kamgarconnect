import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StarRating({ rating }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Text key={i} style={[styles.star, i <= Math.floor(rating) ? styles.active : styles.inactive]}>
        ★
      </Text>
    );
  }
  return <View style={styles.container}>{stars}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    marginRight: 2,
  },
  active: {
    color: '#FFD700',
  },
  inactive: {
    color: '#333',
  },
});
