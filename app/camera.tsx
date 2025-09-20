import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View, Platform, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/utils/supabase';
import { File } from 'expo-file-system';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';

export default function App() {
	const router = useRouter();
	const { user } = useAuth();
	const [facing, setFacing] = useState<CameraType>('back');
	const [cameraPermission, requestCameraPermission] = useCameraPermissions();
	const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
	const [isRecording, setIsRecording] = useState(false);
	const [videoUri, setVideoUri] = useState<string | null>(null);
	const [showSaveButton, setShowSaveButton] = useState(false);
	const [elapsedTime, setElapsedTime] = useState(0);
	const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
	const [uploading, setUploading] = useState(false);
	const [isFromGallery, setIsFromGallery] = useState(false);
	const [showPreview, setShowPreview] = useState(false);
	const cameraRef = useRef<CameraView>(null);


	useEffect(() => {
		(async () => {
			if (!cameraPermission?.granted) {
				await requestCameraPermission();
			}
			if (!microphonePermission?.granted && Platform.OS === 'android') {
				await requestMicrophonePermission();
			}
		})();
	}, [cameraPermission, microphonePermission]);


	useEffect(() => {
		return () => {
			if (timerInterval) clearInterval(timerInterval);
		};
	}, [timerInterval]);

	if (!cameraPermission || !microphonePermission) {
		return <View />;
	}

	if (!cameraPermission.granted || !microphonePermission.granted) {
		return (
			<View style={styles.container}>
				<Text style={styles.message}>
					{(!cameraPermission.granted ? 'Cámara ' : '')}
					{(!cameraPermission.granted && !microphonePermission.granted ? 'y ' : '')}
					{(!microphonePermission.granted ? 'Micrófono' : '')} no autorizado{(!cameraPermission.granted || !microphonePermission.granted ? 's' : '')}.
				</Text>
				<Button
					onPress={async () => {
						if (!cameraPermission.granted) await requestCameraPermission();
						if (!microphonePermission.granted) await requestMicrophonePermission();
					}}
					title="Otorgar permisos"
				/>
			</View>
		);
	}

	function toggleCameraFacing() {
		setFacing(current => (current === 'back' ? 'front' : 'back'));
	}

	const pickFromGallery = async () => {
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Videos,
				allowsEditing: true,
				quality: 0.1,
			});

			if (!result.canceled && result.assets[0].uri) {
				setVideoUri(result.assets[0].uri);
				setShowSaveButton(true);
				setIsFromGallery(true);
				setElapsedTime(Math.floor(result.assets[0].duration / 1000) || 0);
				setShowPreview(true);
			}
		} catch (error) {
			console.error('Error al seleccionar video:', error);
			Alert.alert('Error', 'No se pudo seleccionar el video.');
		}
	};

	const recordVideo = async () => {
		if (cameraRef.current) {
			if (isRecording) {
				setIsRecording(false);
				if (timerInterval) clearInterval(timerInterval);
				setShowSaveButton(true);
				setIsFromGallery(false);
				setShowPreview(true);
				await cameraRef.current.stopRecording();
			} else {
				if (!microphonePermission.granted) {
					Alert.alert('Permiso Denegado', 'No puedes grabar video con audio sin permiso al micrófono. Ve a ajustes de la app.');
					return;
				}

				setIsRecording(true);
				setShowSaveButton(false);
				setElapsedTime(0);
				const interval = setInterval(() => {
					setElapsedTime(prev => prev + 1);
				}, 1000);
				setTimerInterval(interval);

				try {
					const video = await cameraRef.current.recordAsync();
					console.log('Video grabado:', video.uri);
					setVideoUri(video.uri);
					setIsRecording(false);
					if (timerInterval) clearInterval(timerInterval);
				} catch (error) {
					console.error('Error al grabar video:', error);
					setIsRecording(false);
					if (timerInterval) clearInterval(timerInterval);
					Alert.alert('Error', 'No se pudo grabar el video. Verifica los permisos.');
				}
			}
		}
	};

	const saveVideo = async () => {
		if (!videoUri) return;

		setUploading(true);

		try {
			const { data: { user }, error: authError } = await supabase.auth.getUser();
			if (authError || !user) {
				Alert.alert('Error de Sesión', 'Debes iniciar sesión para guardar videos.');
				return;
			}


			const formData = new FormData();
			const fileName = videoUri.split('/').pop();
			formData.append('file', {
				uri: videoUri,
				type: 'video/mp4',
				name: fileName,
			});


			const file = new File(videoUri);
			if (!file.exists) {
				Alert.alert('Error', 'El archivo de video no existe.');
				return;
			}

			const path = `${user.id}/${Date.now()}.mp4`;
			const { data, error } = await supabase.storage
				.from('videos')
				.upload(path, formData, { contentType: 'video/mp4' });

			if (error) {
				console.error('Error subiendo video:', error);
				Alert.alert('Error', `No se pudo subir el video: ${error.message}`);
			} else {
				console.log('Video subido exitosamente:', data);
				const duration = isFromGallery ? 'desde galería' : formatTime(elapsedTime);
				Alert.alert('Éxito', `Video guardado (${duration}) en tu perfil.`);
				setVideoUri(null);
				setShowSaveButton(false);
				setElapsedTime(0);
				setIsFromGallery(false);
				setShowPreview(false);
			}
			const { error: videoError } = await supabase.from('Video').insert({
					uri: data?.path,
					user_id: user?.id,
					title: `${user?.id}_${new Date()}_video`
				})
				if(videoError) console.error("Error en saveVideo", videoError)
		} catch (err) {
			console.error('Error general en saveVideo:', err);
			Alert.alert('Error', 'Ocurrió un problema al guardar el video.');
		} finally {
			setUploading(false);
		}
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	return (
		<View style={styles.container}>

			{showPreview && videoUri ? (
				<VideoPreview uri={videoUri} onClose={() => setShowPreview(false)} />
			) : (
				<CameraView mode="video" ref={cameraRef} style={styles.camera} facing={facing} />
			)}

			{isRecording && (
				<View style={styles.timerContainer}>
					<Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
				</View>
			)}

			<View style={styles.buttonContainer}>
				<View className="flex flex-row justify-between w-full px-8">
					<TouchableOpacity className="flex-1" onPress={toggleCameraFacing}>
						<Ionicons name="camera-reverse-outline" size={24} color="white" />
					</TouchableOpacity>
					<TouchableOpacity className="flex-1 items-center" onPress={recordVideo}>
						{!isRecording ? (
							<Ionicons name="radio-button-on" size={70} color="white" />
						) : (
							<Ionicons name="pause-circle" size={70} color="#7E22CE" />
						)}
					</TouchableOpacity>
					<TouchableOpacity className="flex-1 items-end" onPress={pickFromGallery}>
						<Ionicons name="image-outline" size={24} color="white" />
					</TouchableOpacity>
				</View>
			</View>

			{showSaveButton && videoUri && (
				<View style={styles.saveButtonContainer}>
					<TouchableOpacity
						className="bg-[#7E22CE] p-4 rounded-full mx-4"
						onPress={saveVideo}
						disabled={uploading}
					>
						{uploading ? (
							<ActivityIndicator color="white" />
						) : (
							<Text className="text-white font-bold text-center">
								{isFromGallery ? 'Guardar de Galería' : `Guardar Video (${formatTime(elapsedTime)})`}
							</Text>
						)}
					</TouchableOpacity>
					<TouchableOpacity
						className="bg-gray-500 p-4 rounded-full mx-4"
						onPress={() => {
							setVideoUri(null);
							setShowSaveButton(false);
							setElapsedTime(0);
							setIsFromGallery(false);
							setShowPreview(false);
						}}
					>
						<Text className="text-white font-bold text-center">Cancelar</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}


function VideoPreview({ uri, onClose }) {
	const player = useVideoPlayer({ uri }, (p) => p.play());

	return (
		<View style={styles.previewContainer}>
			<VideoView player={player} style={styles.previewVideo} resizeMode="contain" isLooping shouldPlay />
			<TouchableOpacity style={styles.closePreview} onPress={onClose}>
				<Ionicons name="close" size={30} color="white" />
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		backgroundColor: 'black',
	},
	message: {
		textAlign: 'center',
		paddingBottom: 10,
		color: 'white',
	},
	camera: {
		flex: 1,
	},
	previewContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'black',
	},
	previewVideo: {
		width: '100%',
		height: '80%',
	},
	closePreview: {
		position: 'absolute',
		top: 40,
		right: 20,
	},
	timerContainer: {
		position: 'absolute',
		top: 50,
		alignSelf: 'center',
		backgroundColor: 'rgba(0,0,0,0.5)',
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 20,
	},
	timerText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold',
	},
	buttonContainer: {
		position: 'absolute',
		bottom: 32,
		flexDirection: 'row',
		backgroundColor: 'transparent',
		width: '100%',
		paddingHorizontal: 16,
		justifyContent: 'space-between',
	},
	saveButtonContainer: {
		position: 'absolute',
		bottom: 120,
		flexDirection: 'row',
		width: '100%',
		justifyContent: 'space-around',
		backgroundColor: 'transparent',
	},
	button: {
		flex: 1,
		alignItems: 'center',
	},
	text: {
		fontSize: 24,
		fontWeight: 'bold',
		color: 'white',
	},
});

//Version Funcional Empieza aquí hasta la subida de video a supabase - sin poder subir desde la galería 
// import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
// import { useRef, useState, useEffect } from 'react';
// import { Alert, Button, StyleSheet, Text, TouchableOpacity, View, Platform, ActivityIndicator } from 'react-native';
// import Ionicons from '@expo/vector-icons/Ionicons';
// import * as ImagePicker from 'expo-image-picker';
// import { supabase } from '@/utils/supabase';
// import { File } from 'expo-file-system';
// import { VideoView } from 'expo-video';  // ← FIX: Cambia a expo-video para preview
// import { useAuth } from '@/providers/AuthProvider';
// import { useRouter } from 'expo-router';

// export default function App() {
// 	const router = useRouter();
// 	const { user } = useAuth();
// 	const [facing, setFacing] = useState<CameraType>('back');
// 	const [cameraPermission, requestCameraPermission] = useCameraPermissions();
// 	const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
// 	const [isRecording, setIsRecording] = useState(false);
// 	const [videoUri, setVideoUri] = useState<string | null>(null);
// 	const [showSaveButton, setShowSaveButton] = useState(false);
// 	const [elapsedTime, setElapsedTime] = useState(0);
// 	const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
// 	const [uploading, setUploading] = useState(false);
// 	const [uploadProgress, setUploadProgress] = useState(0);  // ← NUEVO: Progreso %
// 	const [isFromGallery, setIsFromGallery] = useState(false);
// 	const [showPreview, setShowPreview] = useState(false);
// 	const cameraRef = useRef<CameraView>(null);

// 	// Solicitar permisos al montar
// 	useEffect(() => {
// 		(async () => {
// 			if (!cameraPermission?.granted) {
// 				await requestCameraPermission();
// 			}
// 			if (!microphonePermission?.granted && Platform.OS === 'android') {
// 				await requestMicrophonePermission();
// 			}
// 		})();
// 	}, [cameraPermission, microphonePermission]);

// 	// Limpiar timer
// 	useEffect(() => {
// 		return () => {
// 			if (timerInterval) clearInterval(timerInterval);
// 		};
// 	}, [timerInterval]);

// 	if (!cameraPermission || !microphonePermission) {
// 		return <View />;
// 	}

// 	if (!cameraPermission.granted || !microphonePermission.granted) {
// 		return (
// 			<View style={styles.container}>
// 				<Text style={styles.message}>
// 					{(!cameraPermission.granted ? 'Cámara ' : '')}
// 					{(!cameraPermission.granted && !microphonePermission.granted ? 'y ' : '')}
// 					{(!microphonePermission.granted ? 'Micrófono' : '')} no autorizado{(!cameraPermission.granted || !microphonePermission.granted ? 's' : '')}.
// 				</Text>
// 				<Button
// 					onPress={async () => {
// 						if (!cameraPermission.granted) await requestCameraPermission();
// 						if (!microphonePermission.granted) await requestMicrophonePermission();
// 					}}
// 					title="Otorgar permisos"
// 				/>
// 			</View>
// 		);
// 	}

// 	function toggleCameraFacing() {
// 		setFacing(current => (current === 'back' ? 'front' : 'back'));
// 	}

// 	// Unificado: Seleccionar video de galería con ImagePicker
// 	const pickFromGallery = async () => {
// 		try {
// 			const result = await ImagePicker.launchImageLibraryAsync({
// 				mediaTypes: ImagePicker.MediaTypeOptions.Videos,
// 				allowsEditing: true,
// 				quality: 1,
// 			});

// 			if (!result.canceled && result.assets[0].uri) {
// 				setVideoUri(result.assets[0].uri);
// 				setShowSaveButton(true);
// 				setIsFromGallery(true);
// 				setElapsedTime(Math.floor(result.assets[0].duration / 1000) || 0);  // Duración en segundos
// 				setShowPreview(true);
// 			}
// 		} catch (error) {
// 			console.error('Error al seleccionar video:', error);
// 			Alert.alert('Error', 'No se pudo seleccionar el video.');
// 		}
// 	};

// 	const recordVideo = async () => {
// 		if (cameraRef.current) {
// 			if (isRecording) {
// 				setIsRecording(false);
// 				if (timerInterval) clearInterval(timerInterval);
// 				setShowSaveButton(true);
// 				setIsFromGallery(false);
// 				setShowPreview(true);
// 				await cameraRef.current.stopRecording();
// 			} else {
// 				if (!microphonePermission.granted) {
// 					Alert.alert('Permiso Denegado', 'No puedes grabar video con audio sin permiso al micrófono. Ve a ajustes de la app.');
// 					return;
// 				}

// 				setIsRecording(true);
// 				setShowSaveButton(false);
// 				setElapsedTime(0);
// 				const interval = setInterval(() => {
// 					setElapsedTime(prev => prev + 1);
// 				}, 1000);
// 				setTimerInterval(interval);

// 				try {
// 					const video = await cameraRef.current.recordAsync();
// 					console.log('Video grabado:', video.uri);
// 					setVideoUri(video.uri);
// 					setIsRecording(false);
// 					if (timerInterval) clearInterval(timerInterval);
// 				} catch (error) {
// 					console.error('Error al grabar video:', error);
// 					setIsRecording(false);
// 					if (timerInterval) clearInterval(timerInterval);
// 					Alert.alert('Error', 'No se pudo grabar el video. Verifica los permisos.');
// 				}
// 			}
// 		}
// 	};

// 	const saveVideo = async () => {
// 		if (!videoUri) return;

// 		setUploading(true);
// 		setUploadProgress(0);  // Reset progreso

// 		try {
// 			const { data: { user }, error: authError } = await supabase.auth.getUser();
// 			if (authError || !user) {
// 				Alert.alert('Error de Sesión', 'Debes iniciar sesión para guardar videos.');
// 				return;
// 			}

// 			// ← FIX: Blob con fetch
// 			const response = await fetch(videoUri);
// 			const blob = await response.blob();

// 			// ← FIX: Chequeo exists como propiedad booleana (no método)
// 			const file = new File(videoUri);
// 			if (!file.exists) {  // Sin await ni ()
// 				Alert.alert('Error', 'El archivo de video no existe.');
// 				return;
// 			}

// 			const fileName = `${user.id}/${Date.now()}.mp4`;
// 			const { data, error } = await supabase.storage
// 				.from('videos')
// 				.upload(fileName, blob, {
// 					contentType: 'video/mp4', onProgress: (event) => {  // ← NUEVO: Progreso
// 						const progress = Math.round((event.loaded / event.total) * 100);
// 						setUploadProgress(progress);
// 					}
// 				});

// 			if (error) {
// 				console.error('Error subiendo video:', error);
// 				Alert.alert('Error', `No se pudo subir el video: ${error.message}`);
// 			} else {
// 				console.log('Video subido exitosamente:', data);
// 				const duration = isFromGallery ? 'desde galería' : formatTime(elapsedTime);
// 				Alert.alert('Éxito', `Video guardado (${duration}) en tu perfil.`);
// 				setVideoUri(null);
// 				setShowSaveButton(false);
// 				setElapsedTime(0);
// 				setIsFromGallery(false);
// 				setShowPreview(false);
// 			}
// 		} catch (err) {
// 			console.error('Error general en saveVideo:', err);
// 			Alert.alert('Error', 'Ocurrió un problema al guardar el video.');
// 		} finally {
// 			setUploading(false);
// 		}
// 	};

// 	const formatTime = (seconds: number) => {
// 		const mins = Math.floor(seconds / 60);
// 		const secs = seconds % 60;
// 		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
// 	};

// 	return (
// 		<View style={styles.container}>
// 			{/* Preview del video */}
// 			{showPreview && videoUri ? (
// 				<View style={styles.previewContainer}>
// 					<VideoView  // ← FIX: Cambia a VideoView de expo-video
// 						source={{ uri: videoUri }}
// 						style={styles.previewVideo}
// 						resizeMode="contain"
// 						isLooping
// 						shouldPlay
// 					/>
// 					<TouchableOpacity style={styles.closePreview} onPress={() => setShowPreview(false)}>
// 						<Ionicons name="close" size={30} color="white" />
// 					</TouchableOpacity>
// 				</View>
// 			) : (
// 				<CameraView mode="video" ref={cameraRef} style={styles.camera} facing={facing} />
// 			)}

// 			{isRecording && (
// 				<View style={styles.timerContainer}>
// 					<Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
// 				</View>
// 			)}

// 			<View style={styles.buttonContainer}>
// 				<View className="flex flex-row justify-between w-full px-8">
// 					<TouchableOpacity className="flex-1" onPress={toggleCameraFacing}>
// 						<Ionicons name="camera-reverse-outline" size={24} color="white" />
// 					</TouchableOpacity>
// 					<TouchableOpacity className="flex-1 items-center" onPress={recordVideo}>
// 						{!isRecording ? (
// 							<Ionicons name="radio-button-on" size={70} color="white" />
// 						) : (
// 							<Ionicons name="pause-circle" size={70} color="#7E22CE" />
// 						)}
// 					</TouchableOpacity>
// 					<TouchableOpacity className="flex-1 items-end" onPress={pickFromGallery}>
// 						<Ionicons name="image-outline" size={24} color="white" />
// 					</TouchableOpacity>
// 				</View>
// 			</View>

// 			{showSaveButton && videoUri && (
// 				<View style={styles.saveButtonContainer}>
// 					<TouchableOpacity
// 						className="bg-[#7E22CE] p-4 rounded-full mx-4"
// 						onPress={saveVideo}
// 						disabled={uploading}
// 					>
// 						{uploading ? (
// 							<Text className="text-white font-bold text-center">Subiendo {uploadProgress}%...</Text>  // ← NUEVO: Muestra %
// 						) : (
// 							<Text className="text-white font-bold text-center">
// 								{isFromGallery ? 'Guardar de Galería' : `Guardar Video (${formatTime(elapsedTime)})`}
// 							</Text>
// 						)}
// 					</TouchableOpacity>
// 					<TouchableOpacity
// 						className="bg-gray-500 p-4 rounded-full mx-4"
// 						onPress={() => {
// 							setVideoUri(null);
// 							setShowSaveButton(false);
// 							setElapsedTime(0);
// 							setIsFromGallery(false);
// 							setShowPreview(false);
// 						}}
// 					>
// 						<Text className="text-white font-bold text-center">Cancelar</Text>
// 					</TouchableOpacity>
// 				</View>
// 			)}
// 		</View>
// 	);
// }

// const styles = StyleSheet.create({
// 	container: {
// 		flex: 1,
// 		justifyContent: 'center',
// 		backgroundColor: 'black',
// 	},
// 	message: {
// 		textAlign: 'center',
// 		paddingBottom: 10,
// 		color: 'white',
// 	},
// 	camera: {
// 		flex: 1,
// 	},
// 	previewContainer: {
// 		flex: 1,
// 		justifyContent: 'center',
// 		alignItems: 'center',
// 		backgroundColor: 'black',
// 	},
// 	previewVideo: {
// 		width: '100%',
// 		height: '80%',
// 	},
// 	closePreview: {
// 		position: 'absolute',
// 		top: 40,
// 		right: 20,
// 	},
// 	timerContainer: {
// 		position: 'absolute',
// 		top: 50,
// 		alignSelf: 'center',
// 		backgroundColor: 'rgba(0,0,0,0.5)',
// 		paddingHorizontal: 20,
// 		paddingVertical: 10,
// 		borderRadius: 20,
// 	},
// 	timerText: {
// 		color: 'white',
// 		fontSize: 18,
// 		fontWeight: 'bold',
// 	},
// 	buttonContainer: {
// 		position: 'absolute',
// 		bottom: 32,
// 		flexDirection: 'row',
// 		backgroundColor: 'transparent',
// 		width: '100%',
// 		paddingHorizontal: 16,
// 		justifyContent: 'space-between',
// 	},
// 	saveButtonContainer: {
// 		position: 'absolute',
// 		bottom: 120,
// 		flexDirection: 'row',
// 		width: '100%',
// 		justifyContent: 'space-around',
// 		backgroundColor: 'transparent',
// 	},
// 	button: {
// 		flex: 1,
// 		alignItems: 'center',
// 	},
// 	text: {
// 		fontSize: 24,
// 		fontWeight: 'bold',
// 		color: 'white',
// 	},
// });
//Version Funcional Empieza aquí

// import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
// import { useRef, useState, useEffect } from 'react';
// import { Alert, Button, StyleSheet, Text, TouchableOpacity, View, Platform, ActivityIndicator } from 'react-native';  
// import Ionicons from '@expo/vector-icons/Ionicons';
// import * as DocumentPicker from 'expo-document-picker';  
// import { supabase } from '@/utils/supabase';
// import * as FileSystem from 'expo-file-system/legacy';  
// import { useAuth } from '@/providers/AuthProvider';
// import { useRouter } from 'expo-router';
// import * as ImagePicker from 'expo-image-picker';
// import { useVideoPlayer, VideoView } from 'expo-video';

// export default function App() {
// 	const router = useRouter();
// 	const [facing, setFacing] = useState<CameraType>('back');
// 	const [cameraPermission, requestCameraPermission] = useCameraPermissions();
// 	const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
// 	const [isRecording, setIsRecording] = useState(false);
// 	const [videoUri, setVideoUri] = useState<string | null>(null);
// 	const [showSaveButton, setShowSaveButton] = useState(false);
// 	const [elapsedTime, setElapsedTime] = useState(0);
// 	const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
// 	const [uploading, setUploading] = useState(false); 
// 	const [isFromGallery, setIsFromGallery] = useState(false); 
// 	const cameraRef = useRef<CameraView>(null);

	

// 	const { user } = useAuth();
// 	useEffect(() => {
// 		(async () => {
// 			if (!cameraPermission?.granted) {
// 				await requestCameraPermission();
// 			}
// 			if (!microphonePermission?.granted && Platform.OS === 'android') {
// 				await requestMicrophonePermission();
// 			}
// 		})();
// 	}, [cameraPermission, microphonePermission]);


// 	useEffect(() => {
// 		return () => {
// 			if (timerInterval) clearInterval(timerInterval);
// 		};
// 	}, [timerInterval]);

// 	if (!cameraPermission || !microphonePermission) {
// 		return <View />;
// 	}

// 	if (!cameraPermission.granted || !microphonePermission.granted) {
// 		return (
// 			<View style={styles.container}>
// 				<Text style={styles.message}>
// 					{(!cameraPermission.granted ? 'Cámara ' : '')}
// 					{(!cameraPermission.granted && !microphonePermission.granted ? 'y ' : '')}
// 					{(!microphonePermission.granted ? 'Micrófono' : '')} no autorizado{(!cameraPermission.granted || !microphonePermission.granted ? 's' : '')}.
// 				</Text>
// 				<Button
// 					onPress={async () => {
// 						if (!cameraPermission.granted) await requestCameraPermission();
// 						if (!microphonePermission.granted) await requestMicrophonePermission();
// 					}}
// 					title="Otorgar permisos"
// 				/>
// 			</View>
// 		);
// 	}

// 	function toggleCameraFacing() {
// 		setFacing(current => (current === 'back' ? 'front' : 'back'));
// 	}


// 	const pickFromGallery = async () => {
// 		console.log("[camera.tsx] - In pickFromGallery function");
		
// 		try {
// 			const result = await DocumentPicker.getDocumentAsync({
// 				type: 'video/*', 
// 				copyToCacheDirectory: true,  
// 			});
// 			console.log("[camera.tsx] - Inside of try ");
// 			if (result.type === 'success' && result.uri) {
// 				console.log("result type");
// 				console.log("result.type", result.type, result.uri);

				
// 				setVideoUri(result.uri);
// 				setShowSaveButton(true);
// 				setIsFromGallery(true);
// 				setElapsedTime(0);  
// 				Alert.alert('Video Seleccionado', 'Ahora puedes guardarlo.');
// 			}
// 		} catch (error) {
// 			console.error('Error al seleccionar video:', error);
// 			Alert.alert('Error', 'No se pudo seleccionar el video.');
// 		}
// 	};

// 	const recordVideo = async () => {
// 		if (cameraRef.current) {
// 			if (isRecording) {
// 				setIsRecording(false);
// 				if (timerInterval) clearInterval(timerInterval);
// 				setShowSaveButton(true);
// 				setIsFromGallery(false);  
// 				await cameraRef.current.stopRecording();
// 			} else {
// 				if (!microphonePermission.granted) {
// 					Alert.alert('Permiso Denegado', 'No puedes grabar video con audio sin permiso al micrófono. Ve a ajustes de la app.');
// 					return;
// 				}

// 				setIsRecording(true);
// 				setShowSaveButton(false);
// 				setElapsedTime(0);
// 				const interval = setInterval(() => {
// 					setElapsedTime(prev => {
// 						if (prev >= 60) {  
// 							clearInterval(interval);
// 							setIsRecording(false);
// 							Alert.alert('Límite Alcanzado', 'Grabación máxima de 60 segundos.');
// 							return prev;
// 						}
// 						return prev + 1;
// 					});
// 				}, 1000);
// 				setTimerInterval(interval);

// 				try {
// 					const video = await cameraRef.current.recordAsync();
// 					console.log('Video grabado:', video.uri);
// 					setVideoUri(video.uri);
// 					setIsRecording(false);
// 					if (timerInterval) clearInterval(timerInterval);
// 				} catch (error) {
// 					console.error('Error al grabar video:', error);
// 					setIsRecording(false);
// 					if (timerInterval) clearInterval(timerInterval);
// 					Alert.alert('Error', 'No se pudo grabar el video. Verifica los permisos.');
// 				}
// 			}
// 		}
// 	};


// 	const saveVideo = async () => {
// 		if (!videoUri) return;

// 		setUploading(true); 

// 		try {
// 			const { data: { user }, error: authError } = await supabase.auth.getUser();
// 			if (authError || !user) {
// 				Alert.alert('Error de Sesión', 'Debes iniciar sesión para guardar videos.');
// 				return;
// 			}

// 			const fileInfo = await FileSystem.getInfoAsync(videoUri); 
// 			if (!fileInfo.exists) {
// 				Alert.alert('Error', 'El archivo de video no existe.');
// 				return;
// 			}

// 			const base64 = await FileSystem.readAsStringAsync(videoUri, { encoding: FileSystem.EncodingType.Base64 });
// 			const binaryString = atob(base64);
// 			const bytes = new Uint8Array(binaryString.length);
// 			for (let i = 0; i < binaryString.length; i++) {
// 				bytes[i] = binaryString.charCodeAt(i);
// 			}

// 			const fileName = `${user.id}/${Date.now()}.mp4`;
// 			const { data, error } = await supabase.storage
// 				.from('videos')
// 				.upload(fileName, bytes, { contentType: 'video/mp4' });

// 			if (error) {
// 				console.error('Error subiendo video:', error);
// 				Alert.alert('Error', `No se pudo subir el video: ${error.message}`);
// 			} else {
// 				console.log('Video subido exitosamente:', data);
// 				const duration = isFromGallery ? 'desde galería' : formatTime(elapsedTime);
// 				Alert.alert('Éxito', `Video guardado (${duration}) en tu perfil.`);
// 				setVideoUri(null);
// 				setShowSaveButton(false);
// 				setElapsedTime(0);
// 				setIsFromGallery(false);
// 			}

// 			const { error: videoError } = await supabase.from('Video').insert({
// 				uri: data?.path,
// 				user_id: user?.id,
// 				title: `${user?.id}_${new Date()}_video`
// 			})
// 			if(videoError) console.error("Error en saveVideo", videoError)
// 		} catch (err) {
// 			console.error('Error general en saveVideo:', err);
// 			Alert.alert('Error', 'Ocurrió un problema al guardar el video.');
// 		} finally {
// 			setUploading(false); 
// 		}
// 		router.back();
// 	};

// 	const formatTime = (seconds: number) => {
// 		const mins = Math.floor(seconds / 60);
// 		const secs = seconds % 60;
// 		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
// 	};


// 	//Image
// 	const pickImage = async () => {
// 		console.log("[camera.tsx] - pickImage Function");
		
// 		// No permissions request is necessary for launching the image library
// 		let result = await ImagePicker.launchImageLibraryAsync({
// 			mediaTypes: ['images', 'videos'],
// 			allowsEditing: true,
// 			aspect: [4, 3],
// 			quality: 0.1,
// 		});
// 		console.log("El valor de result",result);
// 		console.log("El valor de result.assets[0].uri", result.assets[0].uri);
// 		console.log(result.assets[0].uri);
// 		setVideoUri(result.assets[0].uri)
		

// 		// if (!result.canceled) {
// 		// 	setImage(result.assets[0].uri);
// 		// }
// 	};



// 	return (
// 		<View style={styles.container}>
// 			<CameraView mode="video" ref={cameraRef} style={styles.camera} facing={facing} />
// 			{isRecording && (
// 				<View style={styles.timerContainer}>
// 					<Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
// 				</View>
// 			)}

// 			<View style={styles.buttonContainer}>
// 				<View className="flex flex-row justify-between w-full px-8">
// 					<TouchableOpacity className="flex-1" onPress={toggleCameraFacing}>
// 						<Ionicons name="aperture" size={24} color="white" />
// 					</TouchableOpacity>
// 					<TouchableOpacity className="flex-1 items-center" onPress={recordVideo}>
// 						{!isRecording ? (
// 							<Ionicons name="radio-button-on" size={70} color="white" />
// 						) : (
// 							<Ionicons name="pause-circle" size={70} color="#7E22CE" />
// 						)}
// 					</TouchableOpacity>
// 					<TouchableOpacity className="flex-1 items-end -top-8" onPress={pickImage}>
// 						<Ionicons name="image-outline" size={24} color="white" />
// 					</TouchableOpacity>

// 					<TouchableOpacity className="flex-1 items-end" onPress={pickFromGallery}>
// 						<Ionicons name="videocam" size={24} color="white" />
// 					</TouchableOpacity>
// 				</View>
// 			</View>


// 			{showSaveButton && videoUri && (
// 				<View style={styles.saveButtonContainer}>
// 					<TouchableOpacity
// 						className="bg-[#7E22CE] p-4 rounded-full mx-4"
// 						onPress={saveVideo}
// 						disabled={uploading} 
// 					>
// 						{uploading ? (
// 							<ActivityIndicator color="white" />
// 						) : (
// 							<Text className="text-white font-bold text-center">
// 								{isFromGallery ? 'Guardar de Galería' : `Guardar Video (${formatTime(elapsedTime)})`}
// 							</Text>
// 						)}
// 					</TouchableOpacity>
// 					<TouchableOpacity
// 						className="bg-gray-500 p-4 rounded-full mx-4"
// 						onPress={() => {
// 							setVideoUri(null);
// 							setShowSaveButton(false);
// 							setElapsedTime(0);
// 							setIsFromGallery(false);
// 						}}
// 					>
// 						<Text className="text-white font-bold text-center">Cancelar</Text>
// 					</TouchableOpacity>
// 				</View>
// 			)}
// 		</View>
// 	);
// }

// const styles = StyleSheet.create({
// 	container: {
// 		flex: 1,
// 		justifyContent: 'center',
// 		backgroundColor: 'black',
		
// 	},
// 	message: {
// 		textAlign: 'center',
// 		paddingBottom: 10,
// 		color: 'white',
// 	},
// 	camera: {
// 		flex: 1,
// 	},
// 	timerContainer: {
// 		position: 'absolute',
// 		top: 50,
// 		alignSelf: 'center',
// 		backgroundColor: 'rgba(0,0,0,0.5)',
// 		paddingHorizontal: 20,
// 		paddingVertical: 10,
// 		borderRadius: 20,
// 	},
// 	timerText: {
// 		color: 'white',
// 		fontSize: 18,
// 		fontWeight: 'bold',
// 	},
// 	buttonContainer: {
// 		position: 'absolute',
// 		bottom: 32,
// 		flexDirection: 'row',
// 		backgroundColor: 'transparent',
// 		width: '100%',
// 		paddingHorizontal: 16,
// 		justifyContent: 'space-between',
// 	},
// 	saveButtonContainer: {
// 		position: 'absolute',
// 		bottom: 120,
// 		flexDirection: 'row',
// 		width: '100%',
// 		justifyContent: 'space-around',
// 		backgroundColor: 'transparent',
// 	},
// 	button: {
// 		flex: 1,
// 		alignItems: 'center',
// 	},
// 	text: {
// 		fontSize: 24,
// 		fontWeight: 'bold',
// 		color: 'white',
// 	},
// });





// import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
// import { useRef, useState, useEffect } from 'react';
// import { Alert, Button, StyleSheet, Text, TouchableOpacity, View, Platform, PermissionsAndroid } from 'react-native';  
// import Ionicons from '@expo/vector-icons/Ionicons';
// import { supabase } from '@/utils/supabase';

// export default function App() {
// 	const [facing, setFacing] = useState<CameraType>('back');
// 	const [permission, requestPermission] = useCameraPermissions();
// 	const [isRecording, setIsRecording] = useState(false);
// 	const cameraRef = useRef<CameraView>(null);
// 	const [videoUri, setVideoUri] = useState<string | null>(null);

// 	useEffect(() => {
// 		(async () => {
// 			if (!permission?.granted) {
// 				const { granted } = await requestPermission();
// 			}
// 		})();
// 	}, [permission]);

// 	if (!permission) {
// 		return <View />;
// 	}

// 	if (!permission.granted) {
// 		return (
// 			<View style={styles.container}>
// 				<Text style={styles.message}>
// 					Necesitamos tu permiso para usar la cámara y el micrófono
// 				</Text>
// 				<Button
// 					onPress={requestPermission}
// 					title="Otorgar permisos"
// 				/>
// 			</View>
// 		);
// 	}

// 	function toggleCameraFacing() {
// 		setFacing(current => (current === 'back' ? 'front' : 'back'));
// 	}

// 	const requestAudioPermission = async (): Promise<boolean> => {
// 		if (Platform.OS !== 'android') return true;  

// 		try {
// 			const granted = await PermissionsAndroid.request(
// 				PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
// 				{
// 					title: 'Permiso de Micrófono',
// 					message: 'Necesitamos acceso al micrófono para grabar videos con audio.',
// 					buttonNeutral: 'Preguntar después',
// 					buttonNegative: 'Cancelar',
// 					buttonPositive: 'OK',
// 				}
// 			);
// 			return granted === PermissionsAndroid.RESULTS.GRANTED;
// 		} catch (err) {
// 			console.warn(err);
// 			return false;
// 		}
// 	};

// 	const recordVideo = async () => {
// 		if (cameraRef.current) {
// 			if (isRecording) {
// 				setIsRecording(false);
// 				await cameraRef.current.stopRecording();
// 			} else {

// 				if (Platform.OS === 'android') {
// 					const hasAudioPerm = await requestAudioPermission();
// 					if (!hasAudioPerm) {
// 						Alert.alert('Permiso Denegado', 'No puedes grabar video con audio sin permiso al micrófono.');
// 						return;
// 					}
// 				}

// 				setIsRecording(true);
// 				try {
// 					const video = await cameraRef.current.recordAsync();
// 					console.log('Video grabado:', video.uri);
// 					setIsRecording(false);
// 				} catch (error) {
// 					console.error('Error al grabar video:', error);
// 					setIsRecording(false);
// 					Alert.alert('Error', 'No se pudo grabar el video. Verifica los permisos.');
// 				}
// 			}
// 		}
// 	};

// 	const saveVideo = async () => {
// 		const formData = new FormData();
// 		const fileName = videoUri?.split('/').pop();
// 		formData.append('file', {
// 			uri: videoUri,
// 			type: `video/${fileName?.split('.').pop()}`,
// 			name: fileName
// 		})

// 		const { data, error } = await supabase.storage
// 			.from('videos')
// 			.upload(fileName, formData, {
// 				cacheControl: '3600000000',
// 				upsert: false
// 			});
// 		if(error)  console.log(error)
// 			console.log(data)
// 	}

// 	return (
// 		<View style={styles.container}>
// 			<CameraView mode="video" ref={cameraRef} style={styles.camera} facing={facing} />
// 			<View style={styles.buttonContainer}>
// 				<View className="flex flex-row justify-between w-full px-8">
// 					<TouchableOpacity className="flex-1" onPress={toggleCameraFacing}>
// 						<Ionicons name="camera-reverse-outline" size={24} color="white" />
// 					</TouchableOpacity>
// 					<TouchableOpacity className="flex-1 items-center" onPress={recordVideo}>
// 						{/* {!isRecording ? (
// 							<Ionicons name="radio-button-on" size={70} color="white" />
// 						) : (
// 							<Ionicons name="pause-circle" size={70} color="#7E22CE" />
// 						)} */}
// 						{videoUri ? (
// 							<TouchableOpacity className='flex-1 ' onPress={saveVideo}>
// 								: <Ionicons name="checkmark-circle" size={70} color="#7E22CE" />
// 							</TouchableOpacity>
// 						) : (
// 							<TouchableOpacity className='flex-1 ' onPress={recordVideo}>
// 							{!isRecording ? <Ionicons name="radio-button-on" size={70} color="white" /> : <Ionicons name="pause-circle" size={70} color="#7E22CE" />}
// 							</TouchableOpacity>
// 						)}
// 					</TouchableOpacity>
// 					<TouchableOpacity className="flex-1 items-end" onPress={toggleCameraFacing}>
// 						<Ionicons name="folder-open" size={24} color="white" />
// 					</TouchableOpacity>
// 				</View>
// 			</View>
// 		</View>
// 	);
// }

// const styles = StyleSheet.create({
// 	container: {
// 		flex: 1,
// 		justifyContent: 'center',
// 		backgroundColor: 'black',
// 	},
// 	message: {
// 		textAlign: 'center',
// 		paddingBottom: 10,
// 		color: 'white',
// 	},
// 	camera: {
// 		flex: 1,
// 	},
// 	buttonContainer: {
// 		position: 'absolute',
// 		bottom: 32,
// 		flexDirection: 'row',
// 		backgroundColor: 'transparent',
// 		width: '100%',
// 		paddingHorizontal: 16,
// 		justifyContent: 'space-between',
// 	},
// 	button: {
// 		flex: 1,
// 		alignItems: 'center',
// 	},
// 	text: {
// 		fontSize: 24,
// 		fontWeight: 'bold',
// 		color: 'white',
// 	},
// });

// // import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
// // import { useEffect, useRef, useState } from 'react';
// // import { Button, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
// // import Ionicons from '@expo/vector-icons/Ionicons';
// // import * as Permissions from 'expo-permissions';

// // export default function App() {
// // 	const [facing, setFacing] = useState<CameraType>('back');
// // 	const [permission, requestPermission] = useCameraPermissions();
// // 	const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
// // 	const [isRecording, setIsRecording] = useState(false);
// // 	const cameraRef = useRef<CameraView>(null);
// // 	const [videoUri, setVideoUri] = useState<string | null>(null);


// // 	useEffect(() => {
// // 		(async () => {
// // 			if (Platform.OS === 'android') {
// // 				const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
// // 				setAudioPermission(status === 'granted');
// // 			} else {
// // 				// iOS maneja el micrófono junto con la cámara en el permiso inicial
// // 				setAudioPermission(permission?.granted || false);
// // 			}
// // 		})();
// // 	}, [permission]);

// // 	if (!permission) {
// // 		return <View />;
// // 	}

// // 	if (!permission.granted || !audioPermission) {
// // 		return (
// // 			<View style={styles.container}>
// // 				<Text style={styles.message}>
// // 					Necesitamos tu permiso para usar la cámara y el micrófono
// // 				</Text>
// // 				<Button
// // 					onPress={async () => {
// // 						const cameraStatus = await requestPermission();
// // 						if (Platform.OS === 'android' && cameraStatus.granted) {
// // 							const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
// // 							setAudioPermission(status === 'granted');
// // 						}
// // 					}}
// // 					title="Otorgar permisos"
// // 				/>
// // 			</View>
// // 		);
// // 	}

// // 	function toggleCameraFacing() {
// // 		setFacing(current => (current === 'back' ? 'front' : 'back'));
// // 	}

// // 	const recordVideo = async () => {
// // 		if (cameraRef.current) {
// // 			if (isRecording) {
// // 				setIsRecording(false);
// // 				await cameraRef.current.stopRecording();
// // 			} else {
// // 				setIsRecording(true);
// // 				try {
// // 					const video = await cameraRef.current.recordAsync();
// // 					console.log('Video grabado:', video.uri);
// // 					setIsRecording(false); 
// // 				} catch (error) {
// // 					console.error('Error al grabar video:', error);
// // 					setIsRecording(false);
// // 					alert('Error al grabar. Verifica los permisos.');
// // 				}
// // 			}
// // 		}
// // 	};

// // 	const saveVideo = () => {
// // 		console.log("save video");
		
// // 	}

// // 	return (
// // 		<View 
// // 		style={styles.container}>
// // 			<CameraView mode='video' ref={cameraRef}  style={styles.camera} facing={facing} />
// // 			<View 
// // 				style={styles.buttonContainer}
// // 				>
// // 				<View className='flex flex-row gap-28 -inset-8'>
// // 					<View className='justify-start'>
// // 						<TouchableOpacity className='flex-1' onPress={toggleCameraFacing}>
// // 							<Ionicons name="folder-open" size={24} color="white" />
// // 						</TouchableOpacity>
// // 					</View>
// // 						<View className='justify-center'>
// // 							{videoUri ? (
// // 								<TouchableOpacity className='flex-1 ' onPress={saveVideo}>
// // 									: <Ionicons name="checkmark-circle" size={70} color="#7E22CE" />
// // 								</TouchableOpacity>
// // 							) : (
// // 								<TouchableOpacity className='flex-1 ' onPress={recordVideo}>
// // 									{!isRecording ? <Ionicons name="radio-button-on" size={70} color="white" /> : <Ionicons name="pause-circle" size={70} color="#7E22CE" />}
// // 								</TouchableOpacity>
// // 							)}
							
// // 						</View>


					
// // 					<View className='justify-end'>
// // 						<TouchableOpacity className='flex-1' onPress={toggleCameraFacing}>
// // 								<Ionicons name="camera-reverse-outline" size={24} color="white" />
// // 						</TouchableOpacity>
// // 					</View>
// // 				</View>
// // 			</View>
// // 		</View>
// // 	);
// // }

// // const styles = StyleSheet.create({
// // 	container: {
// // 		flex: 1,
// // 		justifyContent: 'center',
// // 	},
// // 	message: {
// // 		textAlign: 'center',
// // 		paddingBottom: 10,
// // 	},
// // 	camera: {
// // 		flex: 1,
// // 	},
// // 	buttonContainer: {
// // 		position: 'absolute',
// // 		bottom: 32,
// // 		flexDirection: 'row',
// // 		backgroundColor: 'transparent',
// // 		width: '100%',
// // 		paddingHorizontal: 64,
// // 	},
// // 	button: {
// // 		flex: 1,
// // 		alignItems: 'center',
// // 	},
// // 	text: {
// // 		fontSize: 24,
// // 		fontWeight: 'bold',
// // 		color: 'white',
// // 	},
// // });


