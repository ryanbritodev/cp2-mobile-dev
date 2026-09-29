/// <reference types="node" />
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExpoConfig } from 'expo/config';

// Public EAS project id. It is not a secret: it identifies the project for EAS
// Build and for the Expo Push Service token used on iOS. The environment can
// override it so other teams may build the project under their own account.
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? 'c59730b9-caa2-48cd-a37d-1f80d0e88068';
const androidPackage = process.env.APP_ANDROID_PACKAGE ?? 'br.com.fiap.chatfirebase';
const iosBundleIdentifier = process.env.APP_IOS_BUNDLE_ID ?? 'br.com.fiap.chatfirebase';

// google-services.json / GoogleService-Info.plist are client-side Firebase
// config files. They are only referenced when present so the project still
// builds before the Firebase project is configured.
const googleServicesFile = existsSync(resolve(__dirname, 'google-services.json'))
  ? './google-services.json'
  : undefined;
const googleServicesInfoPlist = existsSync(resolve(__dirname, 'GoogleService-Info.plist'))
  ? './GoogleService-Info.plist'
  : undefined;

const config: ExpoConfig = {
  name: 'Chat Firebase',
  slug: 'chat-firebase-grupos',
  scheme: 'chatfirebase',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: iosBundleIdentifier,
    googleServicesFile: googleServicesInfoPlist,
    infoPlist: {
      NSCameraUsageDescription: 'Usamos a câmera para você tirar sua foto de perfil ou do grupo.',
      NSPhotoLibraryUsageDescription: 'Usamos a galeria para você escolher sua foto de perfil ou do grupo.',
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    package: androidPackage,
    googleServicesFile,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['POST_NOTIFICATIONS', 'CAMERA'],
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-notifications',
      {
        color: '#2563EB',
        defaultChannel: 'messages',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Usamos a galeria para você escolher sua foto de perfil ou do grupo.',
        cameraPermission: 'Usamos a câmera para você tirar sua foto de perfil ou do grupo.',
      },
    ],
  ],
  extra: {
    eas: easProjectId ? { projectId: easProjectId } : undefined,
  },
};

export default config;
