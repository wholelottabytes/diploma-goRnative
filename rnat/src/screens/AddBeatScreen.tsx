import React, { useState, useContext, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert, View } from 'react-native';
import { TextInput, Button, Title, Chip, Text } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import config from './config';
import { pick } from '@react-native-documents/picker';

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
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>Add New Beat</Title>

      <TextInput label="Title" value={title} onChangeText={setTitle} style={styles.input} mode="outlined" />
      <TextInput label="Author" value={author} style={styles.input} mode="outlined" editable={false} />
      <TextInput label="Price" value={price} onChangeText={setPrice} style={styles.input} mode="outlined" keyboardType="numeric" />
      <TextInput label="Description" value={description} onChangeText={setDescription} style={styles.input} mode="outlined" multiline />
      <TextInput label="Genre" value={genre} onChangeText={setGenre} style={styles.input} mode="outlined" />
      <TextInput label="BPM" value={bpm} onChangeText={setBpm} style={styles.input} mode="outlined" keyboardType="numeric" />
      <TextInput label="Tags (comma separated)" value={tags} onChangeText={setTags} style={styles.input} mode="outlined" />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsContainer}>
        {tags.split(',').map((tag, index) => (
          tag.trim() ? (
            <Chip key={index} style={styles.tag} textStyle={styles.tagText}>{tag.trim()}</Chip>
          ) : null
        ))}
      </ScrollView>

      <Button onPress={handleImagePicker} mode="contained" style={styles.button}>Select Image</Button>
      <TextInput label="Selected Image" value={imageFile?.name || ''} style={styles.input} mode="outlined" editable={false} />

      <Button onPress={handleAudioPicker} mode="contained" style={styles.button}>Select Audio</Button>
      <TextInput label="Selected Audio" value={audioFile?.name || ''} style={styles.input} mode="outlined" editable={false} />

      <Button mode="contained" onPress={handleSubmit} loading={loading} style={styles.submitButton} contentStyle={styles.buttonContent}>Create Beat</Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  title: { textAlign: 'center', marginBottom: 20, fontSize: 24, color: 'black' },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  button: { marginTop: 10, backgroundColor: '#000' },
  submitButton: { marginTop: 20, backgroundColor: '#000' },
  buttonContent: { paddingVertical: 10 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  tag: { margin: 4, backgroundColor: '#e0e0e0' },
  tagText: { color: '#000' },
});

export default AddBeatScreen;
