import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { BugTrackingRoot } from '@ruttl/mobile-sdk';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <BugTrackingRoot
      projectID="A8WDdHuCZhJCIrifxHWd"
      token="BD7KAqd0O2hhJcSkoF8N8pBZaKS2"
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </BugTrackingRoot>
  );
}
