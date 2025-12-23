import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.busungsteel.hr',
  appName: 'BS HR System',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    cleartext: true
  }
};

export default config;
