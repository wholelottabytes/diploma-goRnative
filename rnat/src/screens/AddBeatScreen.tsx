import React, { useState, useContext, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert, View, StatusBar, SafeAreaView } from 'react-native';
import { TextInput, Button, Chip, Text } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import config from './config';
import { pick } from '@react-native-documents/picker';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';

const SERVER = config.API_URL + '/api';

interface PickedFile {
  uri: string;
  name: string | null;
  type: string | null;
}

const AddBeatScreen: React.FC<any> = ({ navigation }) => {
  const { user } = useContext(AuthContext);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [genre, setGenre] = useState('');
  const [bpm, setBpm] = useState('');

  const [imageFile, setImageFile] = useState<PickedFile | null>(null);
  const [audioFile, setAudioFile] = useState<PickedFile | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setAuthor(user.username);
    }
  }, [user]);

  const generateUniqueFilename = (extension: string): string => {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomPart}${extension}`;
  };

  const handleImagePicker = async () => {
    try {
      const [file] = await pick({ type: ['image/*'], mode: 'import' });
      setImageFile({ uri: file.uri, name: file.name, type: file.type });
    } catch (err: any) {
      if (err.code !== 'OPERATION_CANCELED') {
        Alert.alert('Error', 'Failed to select image');
      }
    }
  };

  const handleAudioPicker = async () => {
    try {
      const [file] = await pick({ type: ['audio/*'], mode: 'import' });
      setAudioFile({ uri: file.uri, name: file.name, type: file.type });
    } catch (err: any) {
      if (err.code !== 'OPERATION_CANCELED') {
        Alert.alert('Error', 'Failed to select audio');
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !author || !price || !description || !tags || !genre || !bpm || !imageFile || !audioFile) {
      Alert.alert('Error', 'Please fill in all fields and select files');
      return;
    }
    const priceValue = Number(price);
    if (isNaN(priceValue) || priceValue < 0) {
      Alert.alert('Error', 'Price must be a valid positive number');
      return;
    }

    setLoading(true);
    try {
      const token = user?.token;

      // Upload Image
      const imgExt = imageFile.name?.substring(imageFile.name.lastIndexOf('.')) || '';
      const uniqueImgName = generateUniqueFilename(imgExt);
      const imgData = new FormData();
      imgData.append('file', {
        uri: imageFile.uri,
        name: uniqueImgName,
        type: imageFile.type,
      } as any);

      const imgRes = await fetch(`${SERVER}/beats/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: imgData,
      });

      const imgText = await imgRes.text();
      if (!imgRes.ok) {
        throw new Error(`Error uploading image: ${imgRes.status} ${imgText}`);
      }
      const imgJson = JSON.parse(imgText);

      // Upload Audio
      const audioExt = audioFile.name?.substring(audioFile.name.lastIndexOf('.')) || '';
      const uniqueAudioName = generateUniqueFilename(audioExt);
      const audioData = new FormData();
      audioData.append('file', {
        uri: audioFile.uri,
        name: uniqueAudioName,
        type: audioFile.type,
      } as any);

      const audioRes = await fetch(`${SERVER}/beats/upload-audio`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: audioData,
      });

      const audioText = await audioRes.text();
      if (!audioRes.ok) {
        throw new Error(`Error uploading audio: ${audioRes.status} ${audioText}`);
      }
      const audioJson = JSON.parse(audioText);
      
      // Create Beat
      const newBeat = {
        title,
        price: Number(price),
        description,
        genre,
        bpm: parseInt(bpm, 10),
        tags: tags.split(',').map(t => t.trim()),
        imageUrl: imgJson.objectName,
        audioUrl: audioJson.objectName,
        author_id: user!._id,
      };

      const beatRes = await fetch(`${SERVER}/beats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newBeat),
      });

      const beatText = await beatRes.text();
      if (!beatRes.ok) {
        throw new Error(`Error creating beat: ${beatRes.status} ${beatText}`);
      }
      const beatJson = JSON.parse(beatText);
      
      Alert.alert('Success', `Beat created, ID: ${beatJson._id}`);
      navigation.goBack();
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add New Beat</Text>

        <TextInput 
          label="Title" 
          value={title} 
          onChangeText={setTitle} 
          style={styles.input} 
          mode="outlined"
          theme={{ colors: { primary: Colors.primary } }}
          textColor={Colors.textPrimary}
        />
        <TextInput label="Author" value={author} style={styles.input} mode="outlined" editable={false} theme={{ colors: { primary: Colors.primary } }} textColor={Colors.textPrimary} />
        <TextInput label="Price" value={price} onChangeText={setPrice} style={styles.input} mode="outlined" keyboardType="numeric" theme={{ colors: { primary: Colors.primary } }} textColor={Colors.textPrimary} />
        <TextInput label="Description" value={description} onChangeText={setDescription} style={styles.input} mode="outlined" multiline theme={{ colors: { primary: Colors.primary } }} textColor={Colors.textPrimary} />
        <TextInput label="BPM" value={bpm} onChangeText={setBpm} style={styles.input} mode="outlined" keyboardType="numeric" theme={{ colors: { primary: Colors.primary } }} textColor={Colors.textPrimary} />
        <TextInput label="Tags (comma separated)" value={tags} onChangeText={setTags} style={styles.input} mode="outlined" theme={{ colors: { primary: Colors.primary } }} textColor={Colors.textPrimary} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsContainer}>
          {tags.split(',').map((tag, index) => (
            tag.trim() ? (
              <Chip key={index} style={styles.tag} textStyle={styles.tagText}>{tag.trim()}</Chip>
            ) : null
          ))}
        </ScrollView>

        <Button onPress={handleImagePicker} mode="contained" style={styles.button} color={Colors.primary}>Select Image</Button>
        <TextInput label="Selected Image" value={imageFile?.name || ''} style={styles.input} mode="outlined" editable={false} theme={{ colors: { primary: Colors.primary } }} textColor={Colors.textPrimary} />

        <Button onPress={handleAudioPicker} mode="contained" style={styles.button} color={Colors.primary}>Select Audio</Button>
        <TextInput label="Selected Audio" value={audioFile?.name || ''} style={styles.input} mode="outlined" editable={false} theme={{ colors: { primary: Colors.primary } }} textColor={Colors.textPrimary} />

        <Button mode="contained" onPress={handleSubmit} loading={loading} style={styles.submitButton} contentStyle={styles.buttonContent} color={Colors.primary}>Create Beat</Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { 
    flexGrow: 1, 
    padding: Spacing['2xl'], 
    backgroundColor: Colors.background,
    paddingTop: Spacing['4xl'],
  },
  title: { 
    textAlign: 'center', 
    marginBottom: Spacing['2xl'], 
    fontSize: Typography['2xl'], 
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  input: { 
    marginBottom: Spacing.lg, 
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  button: { 
    marginTop: Spacing.sm, 
    paddingVertical: Spacing.sm,
  },
  submitButton: { 
    marginTop: Spacing['2xl'], 
    paddingVertical: Spacing.base,
  },
  buttonContent: { paddingVertical: Spacing.sm },
  tagsContainer: { paddingVertical: Spacing.sm },
  tag: { 
    backgroundColor: 'rgba(168,85,247,0.2)', 
    marginRight: Spacing.xs,
  },
  tagText: { color: Colors.primary, fontSize: Typography.sm },
});

export default AddBeatScreen;
