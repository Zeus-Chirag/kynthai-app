import { Metadata } from 'next';
import SettingsClient from './settings-client';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your Kyntha account settings, profile, and preferences.',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
