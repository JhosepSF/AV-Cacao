import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { ModelLoader } from '../ml/inference/ModelLoader';

// Ignore certain log warnings that might clutter dev screens
LogBox.ignoreLogs([
  'Require cycle:',
  'Warning: ...',
]);

export default function RootLayout() {
  // Pre-load the models in the background as soon as the app launches
  useEffect(() => {
    const loadModelsInBackground = async () => {
      try {
        console.log('[RootLayout] Starting model pre-loading...');
        await ModelLoader.getInstance().loadModels(false);
      } catch (e) {
        console.error('[RootLayout] Error pre-loading models in background:', e);
      }
    };
    loadModelsInBackground();
  }, []);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="camera" />
        <Stack.Screen name="preview" />
        <Stack.Screen name="processing" />
        <Stack.Screen name="result" />
        <Stack.Screen name="history" />
        <Stack.Screen name="about" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
