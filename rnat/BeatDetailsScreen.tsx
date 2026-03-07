import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Easing, 
  Dimensions,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator
} from 'react-native';
import Slider from '@react-native-community/slider';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import { Star, Play, Pause, ShoppingCart, Edit2, Trash2, Check, X } from 'react-native-feather';
import LinearGradient from 'react-native-linear-gradient';
import { BeatDetailsScreenProps } from './type';
import config from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width } = Dimensions.get('window');
const AnimatedStar = Animated.createAnimatedComponent(Star);

interface VideoRefType {
  seek: (time: number) => void;
}

interface Comment {
  _id: string;
  text: string;
  username: string;
  createdAt: string;
  user: string;
}

interface CommentsResponse {
  comments: Comment[];
  totalPages: number;
  currentPage: number;
  totalComments: number;
}

const BeatDetailsScreen: React.FC<BeatDetailsScreenProps> = ({ route, navigation }) => {
  const { beat } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rating, setRating] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [user, setUser] = useState<{username: string} | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsPage, setCommentsPage] = useState(1);
  const [totalCommentsPages, setTotalCommentsPages] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  
  const floatAnim = useRef(new Animated.Value(0)).current;
  const [isArtworkLoaded, setIsArtworkLoaded] = useState(false);
  const videoRef = useRef<VideoRefType | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const floatInterpolation = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const translateYInterpolation = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-15, 15]
  });

  const fetchUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(
        `http://${config.serverIP}:5000/auth/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  const fetchRatings = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(
        `http://${config.serverIP}:5000/beats/rating/${beat._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRating(response.data.userRating);
      setAverageRating(response.data.averageRating);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  }, [beat._id]);

  const fetchComments = useCallback(async () => {
    setIsLoadingComments(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get<CommentsResponse>(
        `http://${config.serverIP}:5000/comments/beat/${beat._id}`,
        {
          params: { page: commentsPage, limit: 10 },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      setComments(response.data.comments);
      setTotalCommentsPages(response.data.totalPages);
      setTotalComments(response.data.totalComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setIsLoadingComments(false);
    }
  }, [beat._id, commentsPage]);

  useEffect(() => {
    fetchUserData();
    fetchRatings();
  }, [fetchUserData, fetchRatings]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleRate = async (value: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authorization required');
        return;
      }

      setRating(value);
      await axios.post(
        `http://${config.serverIP}:5000/beats/rate/${beat._id}`,
        { value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchRatings();
      Alert.alert('Thank you!', 'Rating submitted');
    } catch (error: any) {
      console.error('Rating error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Submission failed');
    }
  };

  const handleBuy = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authorization required');
        return;
      }

      await axios.post(
        `http://${config.serverIP}:5000/beats/buy/${beat._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success', 'Purchase completed!');
    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Purchase failed');
    }
  };
const handleDeleteBeat = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Error', 'Authorization required');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this beat? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await axios.delete(
                `http://${config.serverIP}:5000/beats/${beat._id}`,
                { 
                  headers: { Authorization: `Bearer ${token}` },
                  timeout: 10000 // 10 секунд таймаут
                }
              );

              if (response.data.success) {
                Alert.alert('Success', response.data.message);
                navigation.goBack();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to delete beat');
              }
              
            } catch (error) {
              let errorMessage = 'Failed to delete beat';
              
              if (axios.isAxiosError(error)) {
                // Обработка ошибок axios
                if (error.response) {
                  // Сервер ответил с кодом ошибки
                  errorMessage = error.response.data.message || 
                               error.response.data.error || 
                               error.response.statusText;
                } else if (error.request) {
                  // Запрос был сделан, но ответ не получен
                  errorMessage = 'No response from server';
                } else {
                  // Ошибка при настройке запроса
                  errorMessage = error.message;
                }
              } else if (error instanceof Error) {
                // Стандартные ошибки JavaScript
                errorMessage = error.message;
              }

              Alert.alert(
                'Error', 
                errorMessage,
                [{ text: 'OK', onPress: () => console.error('Delete error:', error) }]
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  } catch (error) {
    Alert.alert(
      'Error', 
      'Failed to initiate deletion',
      [{ text: 'OK', onPress: () => console.error('Init error:', error) }]
    );
  }
};
  const handleAddComment = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authorization required');
        return;
      }

      await axios.post(
        `http://${config.serverIP}:5000/comments`,
        { text: commentText, beatId: beat._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCommentText('');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.delete(
        `http://${config.serverIP}:5000/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment');
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editedCommentText.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.put(
        `http://${config.serverIP}:5000/comments/${commentId}`,
        { text: editedCommentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditingCommentId(null);
      setEditedCommentText('');
      fetchComments();
    } catch (error) {
      console.error('Error editing comment:', error);
      Alert.alert('Error', 'Failed to edit comment');
    }
  };

  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditedCommentText(comment.text);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditedCommentText('');
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
  };

  const handleProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  };

  const handleEnd = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = () => setIsPlaying(prev => !prev);

  const handleSliderChange = (value: number) => {
    videoRef.current?.seek(value);
    setCurrentTime(value);
  };

  const isBeatOwner = user?.username === beat.user?.username || user?.username === beat.author;
  const isAdmin = user?.username === 'admin0';

  return (
    <LinearGradient 
      colors={['#1a1a1a', '#2a2a2a']} 
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Video
          ref={videoRef as React.RefObject<any>}
          source={{ uri: `http://${config.serverIP}:5000/${beat.audioUrl}` }}
          paused={!isPlaying}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onEnd={handleEnd}
          style={{ width: 0, height: 0 }}
          playInBackground
          playWhenInactive
        />

        <View style={styles.artworkContainer}>
          <Animated.Image
            source={{ uri: `http://${config.serverIP}:5000/${beat.imageUrl}` }}
            style={[
              styles.artwork,
              {
                transform: [
                  { rotate: floatInterpolation },
                  { translateY: translateYInterpolation }
                ],
                opacity: isArtworkLoaded ? 1 : 0
              }
            ]}
            onLoad={() => setIsArtworkLoaded(true)}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{beat.title}</Text>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('UserProfile', { username: beat.author })}
          >
            <Text style={styles.artist}>
              by {beat.user?.username || beat.author || 'Unknown'}
            </Text>
          </TouchableOpacity>
 {(isAdmin || isBeatOwner) && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDeleteBeat}
            >
              <Trash2 width={20} height={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Beat</Text>
            </TouchableOpacity>
          )}
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity 
                key={star} 
                onPress={() => handleRate(star)}
                activeOpacity={0.7}
              >
                <AnimatedStar
                  fill={rating >= star ? '#FFD700' : 'transparent'}
                  stroke={rating >= star ? '#FFD700' : '#fff'}
                  width={32}
                  height={32}
                />
              </TouchableOpacity>
            ))}
          </View>

          {averageRating !== null && (
            <Text style={styles.averageRating}>
              Average: {averageRating.toFixed(1)}/5
            </Text>
          )}

          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Price</Text>
              <Text style={styles.metaValue}>${beat.price}</Text>
            </View>
          </View>

          <View style={styles.playerControls}>
            <TouchableOpacity 
              onPress={togglePlay}
              style={styles.playButton}
            >
              {isPlaying ? (
                <Pause width={32} height={32} color="#fff" />
              ) : (
                <Play width={32} height={32} color="#fff" />
              )}
            </TouchableOpacity>

            <Slider
              style={styles.progressBar}
              minimumValue={0}
              maximumValue={duration}
              value={currentTime}
              onSlidingComplete={handleSliderChange}
              minimumTrackTintColor="#fff"
              maximumTrackTintColor="#555"
              thumbTintColor="#fff"
            />
          </View>

          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatTime(currentTime)}
            </Text>
            <Text style={styles.timeText}>
              {formatTime(duration)}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.buyButton}
            onPress={handleBuy}
          >
            <ShoppingCart width={24} height={24} color="#000" />
            <Text style={styles.buyButtonText}>Purchase Now</Text>
          </TouchableOpacity>

          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{beat.description}</Text>
            <View style={styles.tagsContainer}>
              {beat.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comments ({totalComments})</Text>
            
            {isLoadingComments ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                {comments.map(comment => (
                  <View key={comment._id} style={styles.commentContainer}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comment.username}</Text>
                      <Text style={styles.commentDate}>
                        {new Date(comment.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    
                    {editingCommentId === comment._id ? (
                      <>
                        <TextInput
                          value={editedCommentText}
                          onChangeText={setEditedCommentText}
                          style={styles.editCommentInput}
                          multiline
                        />
                        <View style={styles.editButtons}>
                          
                          <TouchableOpacity 
                            onPress={() => handleEditComment(comment._id)}
                            style={styles.saveEditButton}
                          >
                            <Check width={18} height={18} color="#fff" />
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            onPress={cancelEditing}
                            style={styles.cancelEditButton}
                          >
                            <X width={18} height={18} color="#fff" />
                          </TouchableOpacity>
                          
                        </View>
                      </>
                    ) : (
                      <Text style={styles.commentText}>{comment.text}</Text>
                    )}
                    
                    {/* Action buttons */}
                    <View style={styles.commentActions}>
                      {(user?.username === comment.username || isAdmin) && (
                        <TouchableOpacity 
                          onPress={() => handleDeleteComment(comment._id)}
                          style={styles.commentActionButton}
                        >
                          <Trash2 width={16} height={16} color="#ff4444" />
                        </TouchableOpacity>
                      )}
                      
                      {/* Edit button - show for comment owner or beat owner (admin can already delete) */}
                      {(user?.username === comment.username) && (
                        <TouchableOpacity 
                          onPress={() => startEditingComment(comment)}
                          style={styles.commentActionButton}
                        >
                          <Edit2 width={16} height={16} color="#888" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}

                {/* Pagination */}
                {comments.length > 0 && (
                  <View style={styles.pagination}>
                    <TouchableOpacity 
                      onPress={() => setCommentsPage(p => Math.max(1, p - 1))}
                      disabled={commentsPage === 1}
                    >
                      <Text style={[styles.paginationButton, commentsPage === 1 && styles.disabled]}>
                        Previous
                      </Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.pageInfo}>
                      Page {commentsPage} of {totalCommentsPages}
                    </Text>
                    
                    <TouchableOpacity 
                      onPress={() => setCommentsPage(p => Math.min(totalCommentsPages, p + 1))}
                      disabled={commentsPage === totalCommentsPages}
                    >
                      <Text style={[styles.paginationButton, commentsPage === totalCommentsPages && styles.disabled]}>
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Add comment form */}
                {user && (
                  <View style={styles.addCommentContainer}>
                    <TextInput
                      value={commentText}
                      onChangeText={setCommentText}
                      placeholder="Write a comment..."
                      placeholderTextColor="#888"
                      style={styles.commentInput}
                      multiline
                    />
                    <TouchableOpacity 
                      onPress={handleAddComment}
                      disabled={!commentText.trim()}
                      style={[styles.postButton, !commentText.trim() && styles.disabledButton]}
                    >
                      <Text style={styles.postButtonText}>Post</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  artworkContainer: {
    width: width,
    height: width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  artwork: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  artist: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 8,
  },
  averageRating: {
    color: '#FFD700',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
    deleteButton: {
    backgroundColor: '#ff4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 20,
    marginBottom: 15,
    alignSelf: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  playButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  progressBar: {
    flex: 1,
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  timeText: {
    color: '#888',
    fontSize: 12,
  },
  buyButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 30,
    marginBottom: 25,
  },
  buyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  descriptionBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
  },
  descriptionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  descriptionText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 15,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
  },
  // Comments styles
  commentsSection: {
    marginTop: 30,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  commentContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentAuthor: {
    color: '#fff',
    fontWeight: 'bold',
  },
  commentDate: {
    color: '#888',
    fontSize: 12,
  },
  commentText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  commentActionButton: {
    padding: 5,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
  },
  paginationButton: {
    color: '#fff',
    padding: 10,
  },
  disabled: {
    color: '#555',
  },
  pageInfo: {
    color: '#888',
  },
  addCommentContainer: {
    marginTop: 20,
  },
  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: 10,
    padding: 15,
    minHeight: 80,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  editCommentInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  saveEditButton: {
    backgroundColor: '#4CAF50',
    padding: 5,
    borderRadius: 5,
  },
  cancelEditButton: {
    backgroundColor: '#f44336',
    padding: 5,
    borderRadius: 5,
  },
  postButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  postButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default BeatDetailsScreen;