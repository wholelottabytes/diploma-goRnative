import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Star } from 'react-native-feather';
import { HomeScreenNavigationProp } from './type.ts';
import config from './config';

interface Beat {
  _id: string;
  imageUrl: string;
  audioUrl: string;
  title: string;
  author: string;
  price: number;
  description: string;
  tags: string[];
  user: {
    _id: string;
    username: string;
  };
  createdAt: string;
  averageRating?: number | null;
  ratingsCount?: number;
}

const categories = ['Day', 'Month', 'Year'];

const HomeScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState('Month');
  const [beats, setBeats] = useState<Beat[]>([]);
  const [popularBeats, setPopularBeats] = useState<Beat[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      setLoading(true);
      
      // Fetch recent beats
      const recentResponse = await fetch(`http://${config.serverIP}:5000/beats/recent`);
      const recentData = await recentResponse.json();
      setBeats(recentData);
      
      // Fetch popular beats
      const popularResponse = await fetch(
        `http://${config.serverIP}:5000/beats/popular/${selectedCategory.toLowerCase()}`
      );
      const popularData = await popularResponse.json();
      setPopularBeats(popularData);
    } catch (error) {
      console.error('Ошибка при получении данных:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderPopularBeat = ({ item }: { item: Beat }) => (
    <TouchableOpacity 
      style={styles.popularBeatCard}
      onPress={() => navigation.navigate('BeatDetails', { beat: item })}
    >
      <Image 
        source={{ uri: `http://${config.serverIP}:5000/${item.imageUrl}` }} 
        style={styles.popularBeatImage}
      />
      <View style={styles.popularBeatInfo}>
        <Text style={styles.popularBeatTitle}>{item.title}</Text>
        <Text style={styles.popularBeatAuthor}>by {item.user.username}</Text>
        <View style={styles.popularBeatStats}>
          {item.averageRating ? (
            <View style={styles.ratingContainer}>
              <Star stroke="#FFD700" fill="#FFD700" width={14} height={14} />
              <Text style={styles.popularBeatRating}>
                {item.averageRating.toFixed(1)} ({item.ratingsCount})
              </Text>
            </View>
          ) : (
            <Text style={styles.popularBeatRating}>No ratings</Text>
          )}
          <Text style={styles.popularBeatPrice}>${item.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRecentBeat = ({ item }: { item: Beat }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('BeatDetails', { beat: item })}
      style={styles.recentBeatContainer}
    >
      <View style={styles.imageWrapper}>
        <Image 
          source={{ uri: `http://${config.serverIP}:5000/${item.imageUrl}` }} 
          style={styles.recentBeatImage}
        />
        <View style={styles.imageOverlay} />
        <View style={styles.beatInfoOverlay}>
          <Text style={styles.recentBeatTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.metaContainer}>
            <Text style={styles.authorText}>by {item.user.username}</Text>
            <Text style={styles.priceText}>${item.price}</Text>
          </View>
          {item.averageRating && (
            <View style={styles.ratingContainer}>
              <Star stroke="#FFD700" fill="#FFD700" width={14} height={14} />
              <Text style={styles.ratingText}>
                {item.averageRating.toFixed(1)} ({item.ratingsCount})
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#000" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchData}
            tintColor="#000"
          />
        }
      >
        <View style={styles.container}>
          <Text style={styles.header}>Explore Beats</Text>
          
          <Text style={styles.sectionHeader}>New Releases</Text>
          <FlatList
            data={beats}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item._id}
            renderItem={renderRecentBeat}
            contentContainerStyle={styles.recentList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No recent beats found</Text>
            }
          />
          
          <Text style={styles.sectionHeader}>Trending Now</Text>
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.tab,
                  selectedCategory === item && styles.activeTab
                ]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text style={[
                  styles.tabText,
                  selectedCategory === item && styles.activeTabText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.categoryList}
          />
          
          <FlatList
            data={popularBeats}
            keyExtractor={(item) => item._id}
            renderItem={renderPopularBeat}
            contentContainerStyle={styles.popularList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No popular beats found</Text>
            }
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 25,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 15,
    marginTop: 25,
  },
  recentList: {
    paddingBottom: 10,
  },
  recentBeatContainer: {
    marginRight: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    backgroundColor: '#fff',
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 15,
    overflow: 'hidden',
  },
  recentBeatImage: {
    width: 280,
    height: 180,
    borderRadius: 15,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  beatInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  recentBeatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
    marginRight: 10,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryList: {
    paddingBottom: 15,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
  },
  activeTab: {
    backgroundColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 15,
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  popularList: {
    paddingBottom: 20,
  },
  popularBeatCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  popularBeatImage: {
    width: 100,
    height: 100,
    borderRadius: 15,
  },
  popularBeatInfo: {
    flex: 1,
    padding: 16,
  },
  popularBeatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  popularBeatAuthor: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  popularBeatStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    alignItems: 'center',
  },
  popularBeatRating: {
    fontSize: 14,
    color: '#FFD700',
    alignItems: 'center',
  },
  popularBeatPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 30,
    color: '#666',
  },
});

export default HomeScreen;