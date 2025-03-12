import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Image style={styles.titleLogo} source={require("../assets/images/logo.png")} />
      
      <View style={styles.buttonContainer}>
        <Link href="/handlers" asChild>
          <TouchableOpacity style={styles.button}>
            <MaterialCommunityIcons name="bottle-wine" size={32} color="#FFF" />
            <Text style={styles.buttonText}>Manage Bottles</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/cocktails" asChild>
          <TouchableOpacity style={styles.button}>
            <MaterialCommunityIcons name="glass-cocktail" size={32} color="#FFF" />
            <Text style={styles.buttonText}>Make Cocktails</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  titleLogo: {
    width: 250,
    height: 120,
    alignSelf: 'center', 
    marginTop: 140,
    marginBottom: 0,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  button: {
    backgroundColor: '#2c2c2c',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});