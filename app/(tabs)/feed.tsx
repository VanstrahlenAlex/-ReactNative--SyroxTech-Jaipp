import { supabase } from '@/utils/supabase';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';  
import Ionicons from '@expo/vector-icons/Ionicons';

// Componente separado para el video
const VideoItem = ({ signedUrl, title, userId, createdAt }) => {
	const player = useVideoPlayer({ uri: signedUrl }, (player) => player.play());

	return (
		<View style={styles.postContainer}>
			<View style={styles.header}>
				<Image source={{ uri: 'https://placehold.co/40x40' }} style={styles.avatar} />
				<Text style={styles.username}>{userId.slice(0, 8)}... @{title || 'user'}</Text>
				<TouchableOpacity>
					<Ionicons name="more" size={24} color="gray" />
				</TouchableOpacity>
			</View>
			{signedUrl ? (
				<VideoView
					player={player}
					style={styles.video}
					resizeMode="contain"
					isLooping
					shouldPlay
				/>
			) : (
				<Text>No signed URL available</Text>
			)}
			<View style={styles.footer}>
				<TouchableOpacity style={styles.iconButton}>
					<Ionicons name="heart-outline" size={24} color="red" />
				</TouchableOpacity>
				<TouchableOpacity style={styles.iconButton}>
					<Ionicons name="chatbubble-outline" size={24} color="gray" />
				</TouchableOpacity>
				<TouchableOpacity style={styles.iconButton}>
					<Ionicons name="repeat-outline" size={24} color="gray" />
				</TouchableOpacity>
				<Text style={styles.time}>{createdAt.slice(0, 10)}</Text>
			</View>
		</View>
	);
};

export default function Feed() {
	const [videos, setVideos] = useState([]);  
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	console.log("[feed.tsx] - Iniciando");

	useEffect(() => {
		getVideos();
	}, []);

	const getVideos = async () => {
		try {
			const { data: dataGetVideos, error } = await supabase
				.from('Video')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) {
				setError(error.message);
				setLoading(false);
				return;
			}

			console.log("[feed.tsx] - dataGetVideos: ", dataGetVideos);
			await getSignUrls(dataGetVideos || []);  
		} catch (err) {
			setError(err.message);
			setLoading(false);
			console.log("[feed.tsx] - err.message", err.message);
		}
	};

	const getSignUrls = async (videos) => {
		if (!videos || videos.length === 0) {
			setVideos([]);
			setLoading(false);
			return;
		}

		const paths = videos.map((video) => video.uri);  

		const { data: dataGetSignUrls, error: errorGetSignUrls } = await supabase
			.storage
			.from('videos')
			.createSignedUrls(paths, 69 * 60 * 24 * 7);  

		if (errorGetSignUrls) {
			console.log("Error función getSignUrls: ", errorGetSignUrls);
			setError(errorGetSignUrls.message);
			setLoading(false);
			return;
		}

		// Combina signed URLs con videos originales
		const videosWithUrls = videos.map((video, index) => ({
			...video,
			signedUrl: dataGetSignUrls[index]?.signedUrl || null,
		}));

		setVideos(videosWithUrls);
		setLoading(false);
	};

	if (loading) {
		return (
			<View className='flex-1 items-center justify-center bg-primary-pink'>
				<ActivityIndicator size="large" color="#0000ff" />
			</View>
		);
	}

	if (error) {
		return (
			<View className='flex-1 items-center justify-center bg-primary-pink'>
				<Text>Error: {error}</Text>
			</View>
		);
	}

	return (
		<FlatList
			data={videos}
			keyExtractor={(item) => item.id.toString()}
			renderItem={({ item }) => (
				<VideoItem
					signedUrl={item.signedUrl}
					title={item.title}
					userId={item.user_id}
					createdAt={item.created_at}
				/>
			)}
			ListEmptyComponent={<Text>No videos found</Text>}
			style={{ backgroundColor: 'black' }}  // Fondo negro como Figma
		/>
	);
}

const styles = StyleSheet.create({
	postContainer: {
		marginVertical: 10,
		backgroundColor: 'black',
		borderBottomWidth: 1,
		borderBottomColor: 'gray',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
	},
	username: {
		flex: 1,
		marginLeft: 10,
		color: 'white',
		fontWeight: 'bold',
	},
	video: {
		width: '100%',
		height: 200,
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
	},
	iconButton: {
		marginRight: 20,
	},
	time: {
		marginLeft: 'auto',
		color: 'gray',
	},
});