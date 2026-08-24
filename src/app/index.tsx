import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        
        {/* Logo/Branding Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {/* Display Logo if available, else a stylized avatar */}
            <Image 
              source={require('../../Logo.jpeg')} 
              style={styles.logo}
              defaultSource={require('../../assets/images/icon.png')}
            />
          </View>
          <Text style={styles.title}>AV-Cacao</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>
            Análisis asistido del estado sanitario de mazorcas de cacao mediante inteligencia artificial.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={() => router.push('/camera')}
          >
            <Text style={styles.primaryButtonText}>Analizar mazorca</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => router.push('/history')}
          >
            <Text style={styles.secondaryButtonText}>Historial local</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => router.push('/about')}
          >
            <Text style={styles.secondaryButtonText}>Acerca del modelo</Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Inferencia local y offline • Versión 1.0.0
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16110e', // Deep cacao charcoal
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#8c583e', // Warm chocolate brown
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#261c17',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#e5d4c0', // Warm cream
    letterSpacing: 1,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#6c9a75', // Soft green leaf accent
    marginVertical: 16,
    borderRadius: 1.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#b3a290', // Soft brownish grey
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  buttonContainer: {
    width: '100%',
    gap: 14,
    marginVertical: 40,
  },
  primaryButton: {
    backgroundColor: '#8c583e', // Solid cocoa brown
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#261c17', // Darker chocolate card background
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3e2e25',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5d4c0',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6e5e53',
    letterSpacing: 0.5,
  },
});
