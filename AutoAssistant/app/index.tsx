import { Redirect } from 'expo-router';

export default function Index() {
  // Root layout handles auth-based routing, just redirect to tabs as default
  return <Redirect href="/(tabs)" />;
}
