import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { UserProfileScreenProps, Beat } from './type';
import config from './config';

interface User {
  _id: string;
  username: string;
  userPhoto: string;
  description: string;
  balance: number;
}

const SERVER = `http://${config.serverIP}:5000`;

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ route }) => {
  const { username } = route.params;
  const navigation = useNavigation<UserProfileScreenProps['navigation']>();
  const [user, setUser] = useState<User | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchProfileData = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${SERVER}/users/by-username/${username}?page=${pageNum}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (pageNum === 1) {
        setUser(data.user);
        setBeats(data.beats);
      } else {
        setBeats(prev => [...prev, ...data.beats]);
      }
      
      setPage(pageNum);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (initialLoad) setInitialLoad(false);
    }
  }, [username, initialLoad]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleRefresh = useCallback(() => {
    fetchProfileData(1);
  }, [fetchProfileData]);

  const handleLoadMore = useCallback(() => {
    if (page < totalPages && !loading && !refreshing) {
      fetchProfileData(page + 1);
    }
  }, [page, totalPages, loading, refreshing, fetchProfileData]);

  const renderBeatItem = useCallback(({ item }: { item: Beat }) => (
    <TouchableOpacity
      style={styles.beatCard}
      onPress={() => navigation.navigate('BeatDetails', { beat: item })}
    >
      <Image
        source={{
          uri: item.imageUrl
            ? `${SERVER}/${item.imageUrl}`
            : 'https://via.placeholder.com/150'
        }}
        style={styles.beatImage}
      />
      <View style={styles.beatInfo}>
        <Text style={styles.beatTitle}>{item.title}</Text>
        <Text style={styles.beatPrice}>${item.price.toFixed(2)}</Text>
        <Text style={styles.beatAuthor}>@{item.author}</Text>
        <Text style={styles.beatDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }, [loading]);

  if (initialLoad) {
    return (
      <LinearGradient colors={['#1a1a1a', '#2a2a2a']} style={styles.container}>
        <ActivityIndicator size="large" color="#fff" style={styles.loader} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a1a', '#2a2a2a']} style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.profileHeader}>
              <Image
                source={{
                  uri: user?.userPhoto
                    ? `${SERVER}/${user.userPhoto}`
                    : 'https://via.placeholder.com/150'
                }}
                style={styles.avatar}
              />
              <Text style={styles.username}>@{user?.username}</Text>
              {user?.description && (
                <Text style={styles.description}>{user.description}</Text>
              )}
            </View>
            <Text style={styles.sectionTitle}>
              {user?.username}'s Beats ({beats.length})
            </Text>
          </>
        }
        data={beats}
        renderItem={renderBeatItem}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.beatsContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    backgroundColor: '#333',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    margin: 15,
    marginLeft: 20,
  },
  beatsContainer: {
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  beatCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
  },
  beatImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#333',
  },
  beatInfo: {
    padding: 10,
  },
  beatTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  beatPrice: {
    color: '#FFD700',
    fontSize: 12,
    marginTop: 5,
  },
  beatAuthor: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 3,
    fontStyle: 'italic',
  },
  beatDate: {
    color: '#888',
    fontSize: 10,
    marginTop: 3,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default UserProfileScreen;