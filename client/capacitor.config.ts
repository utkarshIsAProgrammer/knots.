import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.knots.app',
  appName: 'Knots',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
