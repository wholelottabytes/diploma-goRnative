import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';


export type Beat = {
  _id: string;
  imageUrl: string | null;
  audioUrl: string | null;  
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
  ratingsCount?: number | null;
};


export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  MyBeats: undefined;
  EditBeat: { beat: any };
  AddBeat: undefined;
  BeatDetails: { beat: Beat };
  UserProfile: { username: string };
  
};


// Типы для навигации
export type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
export type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;
export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BeatDetails'>;
export type BeatDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BeatDetails'>;

// Тип для route в BeatDetailsScreen
export type BeatDetailsScreenRouteProp = RouteProp<RootStackParamList, 'BeatDetails'>;

// Тип для пропсов BeatDetailsScreen
export type BeatDetailsScreenProps = {
    route: BeatDetailsScreenRouteProp;
    navigation: BeatDetailsScreenNavigationProp;
};
export type EditBeatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditBeat'>;
export type EditBeatScreenRouteProp = RouteProp<RootStackParamList, 'EditBeat'>;

export type LikedBeatsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export type LikedBeatsScreenProps = {
  navigation: LikedBeatsScreenNavigationProp;
};
// Тип для пропсов EditBeatScreen
export type EditBeatScreenProps = {
  route: EditBeatScreenRouteProp;
  navigation: EditBeatScreenNavigationProp;
};

export type UserProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'UserProfile'
>;

export type UserProfileScreenRouteProp = RouteProp<
  RootStackParamList,
  'UserProfile'
>;

export type UserProfileScreenProps = {
  route: UserProfileScreenRouteProp;
  navigation: UserProfileScreenNavigationProp;
};