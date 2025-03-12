import { Stack } from 'expo-router';
import { Toaster } from 'sonner-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
  return (
    <SafeAreaProvider style={styles.container}>
      <Toaster />
      <Stack 
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1a1a1a' }
        }}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});