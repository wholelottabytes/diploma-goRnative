import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform
} from 'react-native';
import axios from 'axios';
import RNFS from 'react-native-fs';

import { PermissionsAndroid } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import config from './config';
import { AuthContext } from './AuthContext';
import { UserProfileScreenProps, Beat } from './type';

const SERVER_URL = `http://${config.serverIP}:5000`;

type UserProfile = {
  username: string;
  userPhoto?: string;
  description?: string;
  balance?: number;
};

type Transaction = {
  id: string;
  beatId: string;
  beatTitle: string;
  beatImage: string;
  beatAudioUrl: string;
  beatPrice: number;
  beatDescription: string;
  beatTags: string[];
  beatAuthor: string;
  amount: number;
  date: string | Date;
  buyerUsername?: string;
};

type Pagination = {
  page: number;
  total: number;
  totalPages: number;
};

const parseDateSafe = (dateString: string | Date | undefined): Date => {
  try {
    if (!dateString) return new Date();
    if (dateString instanceof Date) return dateString;
    
    if (typeof dateString === 'string' && /[0-9a-fA-F]{24}/.test(dateString)) {
      return new Date();
    }
    
    const parsedDate = new Date(dateString);
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  } catch {
    return new Date();
  }
};

const ProfileScreen = () => {
  const navigation = useNavigation<UserProfileScreenProps['navigation']>();
  const auth = useContext(AuthContext);
  const user = auth?.user;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactions, setTransactions] = useState<{
    purchases: Transaction[];
    sales: Transaction[];
  }>({ purchases: [], sales: [] });
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<{
    purchases: Pagination;
    sales: Pagination;
  }>({
    purchases: { page: 1, total: 0, totalPages: 1 },
    sales: { page: 1, total: 0, totalPages: 1 }
  });

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await axios.get<UserProfile>(`${SERVER_URL}/profile`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setProfile(res.data);
      setDescription(res.data.description || '');
    } catch (e) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

const downloadBeat = async (audioUrl: string, title: string) => {
  try {
    // Проверяем разрешения
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Cannot download without storage permission');
      return;
    }

    // Получаем имя файла из URL
    const filename = audioUrl.split('/').pop() || `${title.replace(/\s+/g, '_')}.mp3`;
    
    // Путь для сохранения файла
    let downloadDest;
    if (Platform.OS === 'android') {
      // Для Android используем Downloads directory
      downloadDest = `${RNFS.DownloadDirectoryPath}/${filename}`;
    } else {
      // Для iOS используем Document directory
      downloadDest = `${RNFS.DocumentDirectoryPath}/${filename}`;
    }

    const fromUrl = `${SERVER_URL}/${audioUrl}`;

    const options = {
      fromUrl,
      toFile: downloadDest,
      // Для Android 10+ нужно добавить этот параметр
      ...(Platform.OS === 'android' && {
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: filename,
          description: 'Beat download',
          path: downloadDest,
          mime: 'audio/mpeg',
        }
      })
    };

    const result = await RNFS.downloadFile(options).promise;

    if (result.statusCode === 200) {
      Alert.alert('Success', `Beat downloaded successfully to ${downloadDest}`);
    } else {
      throw new Error(`Failed with status ${result.statusCode}`);
    }
  } catch (error: unknown) {
  console.error('Download error:', error);

  let errorMessage = 'Failed to download beat';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  Alert.alert('Download Failed', errorMessage);
}
};



  const fetchTransactions = useCallback(async (tab: 'purchases' | 'sales', pageNum = 1) => {
    if (!user) return;
    try {
      const res = await axios.get<{
        transactions: Transaction[];
        total: number;
        page: number;
        totalPages: number;
      }>(`${SERVER_URL}/profile/transactions`, {
        params: { type: tab, page: pageNum, limit: 5 },
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setTransactions(prev => ({
        ...prev,
        [tab]: pageNum === 1 
          ? res.data.transactions 
          : [...prev[tab], ...res.data.transactions]
      }));
      
      setPagination(prev => ({
        ...prev,
        [tab]: {
          page: res.data.page,
          total: res.data.total,
          totalPages: res.data.totalPages
        }
      }));
    } catch (e) {
      Alert.alert('Error', 'Failed to load transactions');
    }
  }, [user]);

const requestStoragePermission = async () => {
  if (Platform.OS === 'android') {
    try {
      // Для Android 13 (API 33) и выше
      if (Platform.Version >= 33) {
        const readPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
        );
        return readPermission === PermissionsAndroid.RESULTS.GRANTED;
      }
      // Для Android 11 (API 30) до Android 12 (API 32)
      else if (Platform.Version >= 30) {
        const readPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return readPermission === PermissionsAndroid.RESULTS.GRANTED;
      }
      // Для Android 10 (API 29) и ниже
      else {
        const writePermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        const readPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return (
          writePermission === PermissionsAndroid.RESULTS.GRANTED &&
          readPermission === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true; 
};
  const loadData = useCallback(async () => {
    await Promise.all([
      fetchProfile(),
      fetchTransactions('purchases'),
      fetchTransactions('sales')
    ]);
  }, [fetchProfile, fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateDescription = async () => {
    try {
      await axios.put(
        `${SERVER_URL}/profile/description`,
        { description },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      Alert.alert('Success', 'Description updated');
      fetchProfile();
    } catch {
      Alert.alert('Error', 'Failed to update description');
    }
  };

  const topUpBalance = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    try {
      await axios.put(
        `${SERVER_URL}/profile/balance`,
        { amount: Number(amount) },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      Alert.alert('Success', 'Balance updated');
      setAmount('');
      fetchProfile();
    } catch {
      Alert.alert('Error', 'Failed to update balance');
    }
  };

  const uploadPhoto = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 1 });
    if (result.assets?.length) {
      const { uri, fileName, type } = result.assets[0];
      const formData = new FormData();
      formData.append('photo', { uri, name: fileName, type } as any);
      try {
        await axios.put(`${SERVER_URL}/profile/photo`, formData, {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        Alert.alert('Success', 'Photo updated');
        fetchProfile();
      } catch {
        Alert.alert('Error', 'Failed to upload photo');
      }
    }
  };

  const handleBeatPress = (transaction: Transaction) => {
    const transactionDate = parseDateSafe(transaction.date);
    
    const beat: Beat = {
      _id: transaction.beatId || '',
      title: transaction.beatTitle || 'Untitled',
      imageUrl: transaction.beatImage || '',
      audioUrl: transaction.beatAudioUrl || '',
      price: transaction.beatPrice || 0,
      description: transaction.beatDescription || '',
      tags: transaction.beatTags || [],
      author: transaction.beatAuthor || 'Unknown',
      user: {
        _id: '',
        username: transaction.beatAuthor || 'Unknown'
      },
      createdAt: transactionDate.toISOString(),
      averageRating: null,
      ratingsCount: null
    };
    
    navigation.navigate('BeatDetails', { beat });
  };

 const renderTransaction = (item: Transaction) => {
  const transactionDate = parseDateSafe(item.date);
  const formattedDate = transactionDate.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const handleLongPress = () => {
    Alert.alert(
      'Download Beat',
      'Are you sure you want to download this beat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            const hasPermission = await requestStoragePermission();
            if (!hasPermission) {
              Alert.alert('Permission Denied', 'Cannot download without storage permission');
              return;
            }
            downloadBeat(item.beatAudioUrl, item.beatTitle);
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.transactionCard}
      key={item.id}
      onPress={() => handleBeatPress(item)}
      onLongPress={activeTab === 'purchases' ? handleLongPress : undefined}
    >
      <Image 
        source={{ uri: item.beatImage ? `${SERVER_URL}/${item.beatImage}` : 'https://via.placeholder.com/150' }} 
        style={styles.transactionImage}
      />
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle} numberOfLines={1}>
          {item.beatTitle}
        </Text>

        {item.buyerUsername && (
          <View style={styles.buyerContainer}>
            <Text style={styles.transactionBuyer}>Buyer: {item.buyerUsername}</Text>
          </View>
        )}

        <View style={styles.transactionBottom}>
          <Text style={styles.transactionAmount}>${item.amount.toFixed(2)}</Text>
          <Text style={styles.transactionDate}>{formattedDate}</Text>
        </View>

        {activeTab === 'purchases' && (
          <Text style={styles.downloadHint}>Long tap to download</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

  if (!auth || !user) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authText}>Please log in to view profile</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000000']}
            tintColor="#000000"
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={uploadPhoto}>
            <Image
              source={profile.userPhoto 
                ? { uri: `${SERVER_URL}/${profile.userPhoto}` }
                : require('./assets/default-avatar.png')}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <Text style={styles.username}>{profile.username}</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.balance}>${profile.balance?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        {/* Profile Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell your story..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={updateDescription}
          >
            <Text style={styles.buttonText}>Update Bio</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Funds</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            placeholderTextColor="#888"
            keyboardType="numeric"
          />
          <TouchableOpacity 
            style={[styles.actionButton, styles.fundButton]}
            onPress={topUpBalance}
          >
            <Text style={styles.buttonText}>Add to Balance</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'purchases' && styles.activeTab]}
            onPress={() => setActiveTab('purchases')}
          >
            <Text style={[styles.tabText, activeTab === 'purchases' && styles.activeTabText]}>
              My Purchases
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'sales' && styles.activeTab]}
            onPress={() => setActiveTab('sales')}
          >
            <Text style={[styles.tabText, activeTab === 'sales' && styles.activeTabText]}>
              My Sales
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions List */}
        <View style={styles.transactionsContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#000000" style={styles.loader} />
          ) : (
            <>
              {(activeTab === 'purchases' ? transactions.purchases : transactions.sales).map(renderTransaction)}
              {!isLoading && transactions[activeTab].length === 0 && (
                <Text style={styles.emptyText}>No {activeTab} found</Text>
              )}
              {pagination[activeTab].page < pagination[activeTab].totalPages && (
                <TouchableOpacity 
                  style={styles.loadMoreButton}
                  onPress={() => fetchTransactions(activeTab, pagination[activeTab].page + 1)}
                >
                  <Text style={styles.loadMoreText}>Load More</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => auth.logout()}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  authText: {
    fontSize: 16,
    color: '#000000',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  profileHeader: {
    paddingVertical: 32,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#000000',
  },
  username: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  balance: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  downloadHint: {
  marginTop: 4,
  fontSize: 12,
  color: 'gray',
  fontStyle: 'italic',
},

  actionButton: {
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  fundButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  longTapText: {
  fontSize: 12,
  color: 'gray',
  marginTop: 4,
  fontStyle: 'italic',
},
  tabButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#000000',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#888888',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  transactionsContainer: {
    margin: 16,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  transactionImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  buyerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionBuyer: {
    fontSize: 14,
    color: '#666666',
  },
  transactionBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  transactionDate: {
    fontSize: 12,
    color: '#888888',
  },
  loadMoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    marginTop: 8,
  },
  loadMoreText: {
    color: '#000000',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    marginTop: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888888',
    fontSize: 16,
  },
});

export default ProfileScreen;