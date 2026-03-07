import React, { useState, useContext } from 'react';
import { ScrollView, StyleSheet, Alert, View } from 'react-native';
import { TextInput, Button, Title, Chip } from 'react-native-paper';
import { AuthContext } from './AuthContext';
import config from './config';
import axios from 'axios';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from './type';
import { pick } from '@react-native-documents/picker';

const SERVER = `http://${config.serverIP}:5000`;

interface PickedFile {
  uri: string;
  name: string | null;
  type: string | null;
}

type EditBeatRouteProp = RouteProp<RootStackParamList, 'EditBeat'>;

const EditBeatScreen: React.FC<any> = () => {
  const { user } = useContext(AuthContext);
  const route = useRoute<EditBeatRouteProp>();
  const navigation = useNavigation();
  const { beat } = route.params;

  const [title, setTitle] = useState(beat.title);
  const [price, setPrice] = useState(String(beat.price));
  const [description, setDescription] = useState(beat.description);
  const [tags, setTags] = useState(beat.tags.join(', '));
  const [imageFile, setImageFile] = useState<PickedFile | null>(null);
  const [loading, setLoading] = useState(false);

  // Генерация уникального имени файла
  const generateUniqueFilename = (extension: string): string => {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomPart}${extension}`;
  };

  // Выбор изображения
  const handleImagePicker = async () => {
    try {
      const [file] = await pick({ type: ['image/*'], mode: 'import' });
      const uniqueName = generateUniqueFilename('.jpg');
      setImageFile({ uri: file.uri, name: uniqueName, type: file.type });
    } catch (err: any) {
      if (err.code !== 'OPERATION_CANCELED') {
        Alert.alert('Error', 'Failed to select image');
      }
    }
  };

 const handleUpdate = async () => {
  if (!title || !price || !description || !tags) {
    Alert.alert('Error', 'Please fill in all required fields');
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
    let imageUrl = beat.imageUrl;
    let oldImageUrl = beat.imageUrl;

    if (imageFile) {
      const imgData = new FormData();
      imgData.append('image', {
        uri: imageFile.uri,
        name: imageFile.name ?? 'photo.jpg',
        type: imageFile.type ?? 'image/jpeg',
      } as any);

      const imgRes = await fetch(`${SERVER}/beats/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: imgData,
      });

      if (!imgRes.ok) {
        throw new Error('Error uploading image');
      }

      const imgJson = await imgRes.json();
      imageUrl = imgJson.imageUrl;

      // Удаляем старое изображение (если оно отличается)
     if (oldImageUrl && oldImageUrl !== imageUrl) {
  const deleteRes = await fetch(`${SERVER}/beats/delete-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl: oldImageUrl }),
  });

  const deleteText = await deleteRes.text(); 
  console.log('Delete response:', deleteText);

  if (!deleteRes.ok) {
    throw new Error(`Delete image failed: ${deleteText}`);
  }
}
    }

    const updatedBeat = {
      title,
      price: parseFloat(price),
      description,
      tags: tags.split(',').map((t: string) => t.trim()),
      imageUrl,
      user: beat.user._id,
    };

    await axios.put(`${SERVER}/beats/${beat._id}`, updatedBeat, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    Alert.alert('Success', 'Beat updated successfully');
    navigation.goBack();
  } catch (err: any) {
    console.log(err.response?.data || err.message);
    Alert.alert('Error', err.response?.data?.error || err.message);
  } finally {
    setLoading(false);
  }
};
  const handleDelete = async () => {
    try {
      const token = user?.token;
      await axios.delete(`${SERVER}/beats/${beat._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert('Success', 'Beat deleted');
      navigation.goBack();
    } catch (err: any) {
      console.log(err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.error || err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>Edit Beat</Title>

      <TextInput
        label="Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Price"
        value={price}
        onChangeText={setPrice}
        style={styles.input}
        mode="outlined"
        keyboardType="numeric"
      />

      <TextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
        mode="outlined"
        multiline
      />

      <TextInput
        label="Tags (comma separated)"
        value={tags}
        onChangeText={setTags}
        style={styles.input}
        mode="outlined"
      />

      <View style={styles.tagsContainer}>
        {tags.split(',').map((tag: string, index: React.Key | null | undefined) => (
          tag.trim() && (
            <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
              {tag.trim()}
            </Chip>
          )
        ))}
      </View>

      <Button 
        onPress={handleImagePicker} 
        mode="contained" 
        style={styles.button}
      >
        {imageFile ? 'Change Image' : 'Select New Image'}
      </Button>

      {imageFile ? (
        <TextInput
          label="New Image Selected"
          value={imageFile.name || ''}
          style={styles.input}
          mode="outlined"
          editable={false}
        />
      ) : (
        <TextInput
          label="Current Image"
          value={beat.imageUrl.split('/').pop() || ''}
          style={styles.input}
          mode="outlined"
          editable={false}
        />
      )}

      <Button 
        onPress={handleUpdate} 
        mode="contained" 
        style={styles.button}
        loading={loading}
      >
        Save Changes
      </Button>

      <Button 
        onPress={handleDelete} 
        mode="contained" 
        style={styles.deleteButton}
      >
        Delete Beat
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 20, 
    backgroundColor: '#fff' 
  },
  title: { 
    textAlign: 'center', 
    marginBottom: 20, 
    fontSize: 24, 
    color: 'black' 
  },
  input: { 
    marginBottom: 15, 
    backgroundColor: '#fff' 
  },
  button: { 
    marginTop: 20, 
    backgroundColor: '#000' 
  },
  deleteButton: { 
    marginTop: 10, 
    backgroundColor: '#d32f2f' 
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  tag: {
    margin: 4,
    backgroundColor: '#e0e0e0',
  },
  tagText: {
    color: '#000',
  },
});

export default EditBeatScreen;