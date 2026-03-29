import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';
import { userApi, walletApi } from '../api/services';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogOut, Music, Heart, Star, CreditCard, Award, Shield } from 'react-native-feather';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: string[];
  rating: number;
  avatar?: string;
}

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const authContext = useContext(AuthContext);
  
  // Check producer role from both profile and authContext
  const isProducer = profile?.roles?.includes('producer') || authContext?.user?.roles?.includes('producer') || false;
  const isManager = profile?.roles?.includes('manager') || authContext?.user?.roles?.includes('manager') || false;

  const handleBecomeProducer = async () => {
    Alert.alert(
      'Become a Producer',
      'Start selling your beats on BeatMarket! You can upload and manage your own beats.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Become Producer',
          onPress: async () => {
            try {
              const updatedProfile = { ...profile, roles: [...(profile?.roles || []), 'producer'] };
              setProfile(updatedProfile);
              await AsyncStorage.setItem('user', JSON.stringify(updatedProfile));
              await AsyncStorage.setItem('token', authContext?.user?.token || '');
              
              // Update auth context
              if (authContext?.login) {
                await authContext.login(authContext.user?.token || '', updatedProfile);
              }
              
              Alert.alert('Success!', 'You are now a producer! 🎵');
            } catch (error) {
              Alert.alert('Error', 'Failed to become producer');
            }
          },
        },
      ]
    );
  };

  const loadProfile = async () => {
    try {
      const [profileRes, walletRes] = await Promise.all([
        userApi.getProfile(),
        walletApi.getBalance(),
      ]);

      setProfile(profileRes.data);
      setBalance(walletRes.data.balance || 0);

      if (profileRes.data.name) {await AsyncStorage.setItem('userName', profileRes.data.name);}
      
      // Also update auth context with latest roles
      const updatedUser = { ...authContext?.user, roles: profileRes.data.roles };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    } catch {
      // fail silently – user can see the logout button
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['token', 'userId', 'userName']);
          authContext?.logout();
        },
      },
    ]);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadProfile();
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const isArtist = profile?.roles?.includes('artist') || profile?.roles?.includes('admin');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <LinearGradient
          colors={['rgba(168,85,247,0.25)', 'transparent']}
          style={styles.hero}>
          <View style={styles.avatarWrap}>
            {profile?.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#A855F7', '#7C3AED']} style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            )}
            {isArtist && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>🎤</Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{profile?.name || 'Unknown User'}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          {profile?.roles && (
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>
                {profile.roles[0]?.toUpperCase() || 'USER'}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatItem label="Balance" value={`$${balance.toFixed(2)}`} />
          <View style={styles.statDivider} />
          <StatItem label="Rating" value={profile?.rating?.toFixed(1) ?? '—'} />
          <View style={styles.statDivider} />
          <StatItem label="Role" value={isProducer ? 'Producer' : 'User'} />
        </View>

        {/* Manager Dashboard */}
        {isManager && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Manager')}
            style={styles.managerBtn}
            activeOpacity={0.8}
          >
            <View style={styles.managerBtnContent}>
              <Shield color={Colors.primary} width={24} height={24} />
              <Text style={styles.managerBtnText}>Manager Dashboard</Text>
            </View>
            <Text style={styles.managerBtnSub}>Review reports & moderate</Text>
          </TouchableOpacity>
        )}

        {/* Producer Stats */}
        {isProducer && (
          <View style={styles.producerStats}>
            <View style={styles.producerStatsHeader}>
              <Award color={Colors.primary} width={20} height={20} />
              <Text style={styles.producerStatsTitle}>Producer Dashboard</Text>
            </View>
            <View style={styles.producerStatsGrid}>
              <StatItem label="Total Beats" value="0" />
              <StatItem label="Sales" value="0" />
              <StatItem label="Earnings" value="$0" />
            </View>
          </View>
        )}

        {/* Become Producer Button */}
        {!isProducer && (
          <TouchableOpacity onPress={handleBecomeProducer} style={styles.becomeProducerBtn} activeOpacity={0.8}>
            <View style={styles.becomeProducerContent}>
              <Award color={Colors.primary} width={24} height={24} />
              <Text style={styles.becomeProducerText}>Become a Producer</Text>
            </View>
            <Text style={styles.becomeProducerSub}>Start selling your beats</Text>
          </TouchableOpacity>
        )}

        {/* Menu */}
        <View style={styles.menu}>
                    {[
            { icon: CreditCard, label: 'Top Up Wallet', onPress: () => navigation.navigate('TopUp') },
            { icon: Music, label: 'My Beats', onPress: () => navigation.navigate('Add') },
            { icon: Heart, label: 'Liked Beats', onPress: () => navigation.navigate('Rated') },
            { icon: Star, label: 'Beat Market', onPress: () => navigation.navigate('Explore') },
          ].map(({ icon: Icon, label, onPress }) => (
            <TouchableOpacity key={label} onPress={onPress} style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <Icon color={Colors.primary} width={20} height={20} />
              </View>
              <Text style={styles.menuLabel}>{label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <LogOut color={Colors.error} width={18} height={18} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  avatarWrap: { position: 'relative', marginBottom: Spacing.base },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarText: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.white },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: { fontSize: 12 },
  name: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: 4 },
  email: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  roleTag: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  roleTagText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: Typography.semibold },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  menu: {
    marginHorizontal: Spacing['2xl'],
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(168,85,247,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  menuLabel: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, fontWeight: Typography.medium },
  menuArrow: { fontSize: Typography.lg, color: Colors.textMuted },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    paddingVertical: Spacing.base,
    marginBottom: Spacing['5xl'],
  },
  logoutText: { color: Colors.error, fontSize: Typography.base, fontWeight: Typography.medium },
  producerStats: {
    marginHorizontal: Spacing['2xl'],
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  producerStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  producerStatsTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  producerStatsGrid: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  becomeProducerBtn: {
    marginHorizontal: Spacing['2xl'],
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  becomeProducerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  becomeProducerText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  becomeProducerSub: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  managerBtn: {
    marginHorizontal: Spacing['2xl'],
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  managerBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  managerBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: '#10B981',
  },
  managerBtnSub: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
