import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View, Platform, PermissionsAndroid } from 'react-native';  // ← AGREGADO: PermissionsAndroid y Alert
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/utils/supabase';

export default function App() {
	const [facing, setFacing] = useState<CameraType>('back');
	const [permission, requestPermission] = useCameraPermissions();
	const [isRecording, setIsRecording] = useState(false);
	const cameraRef = useRef<CameraView>(null);
	const [videoUri, setVideoUri] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			if (!permission?.granted) {
				const { granted } = await requestPermission();
			}
		})();
	}, [permission]);

	if (!permission) {
		return <View />;
	}

	if (!permission.granted) {
		return (
			<View style={styles.container}>
				<Text style={styles.message}>
					Necesitamos tu permiso para usar la cámara y el micrófono
				</Text>
				<Button
					onPress={requestPermission}
					title="Otorgar permisos"
				/>
			</View>
		);
	}

	function toggleCameraFacing() {
		setFacing(current => (current === 'back' ? 'front' : 'back'));
	}

	const requestAudioPermission = async (): Promise<boolean> => {
		if (Platform.OS !== 'android') return true;  

		try {
			const granted = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
				{
					title: 'Permiso de Micrófono',
					message: 'Necesitamos acceso al micrófono para grabar videos con audio.',
					buttonNeutral: 'Preguntar después',
					buttonNegative: 'Cancelar',
					buttonPositive: 'OK',
				}
			);
			return granted === PermissionsAndroid.RESULTS.GRANTED;
		} catch (err) {
			console.warn(err);
			return false;
		}
	};

	const recordVideo = async () => {
		if (cameraRef.current) {
			if (isRecording) {
				setIsRecording(false);
				await cameraRef.current.stopRecording();
			} else {

				if (Platform.OS === 'android') {
					const hasAudioPerm = await requestAudioPermission();
					if (!hasAudioPerm) {
						Alert.alert('Permiso Denegado', 'No puedes grabar video con audio sin permiso al micrófono.');
						return;
					}
				}

				setIsRecording(true);
				try {
					const video = await cameraRef.current.recordAsync();
					console.log('Video grabado:', video.uri);
					setIsRecording(false);
				} catch (error) {
					console.error('Error al grabar video:', error);
					setIsRecording(false);
					Alert.alert('Error', 'No se pudo grabar el video. Verifica los permisos.');
				}
			}
		}
	};

	const saveVideo = async () => {
		const formData = new FormData();
		const fileName = videoUri?.split('/').pop();
		formData.append('file', {
			uri: videoUri,
			type: `video/${fileName?.split('.').pop()}`,
			name: fileName
		})

		const { data, error } = await supabase.storage
			.from('videos')
			.upload(fileName, formData, {
				cacheControl: '3600000000',
				upsert: false
			});
		if(error)  console.log(error)
	}

	return (
		<View style={styles.container}>
			<CameraView mode="video" ref={cameraRef} style={styles.camera} facing={facing} />
			<View style={styles.buttonContainer}>
				<View className="flex flex-row justify-between w-full px-8">
					<TouchableOpacity className="flex-1" onPress={toggleCameraFacing}>
						<Ionicons name="camera-reverse-outline" size={24} color="white" />
					</TouchableOpacity>
					<TouchableOpacity className="flex-1 items-center" onPress={recordVideo}>
						{/* {!isRecording ? (
							<Ionicons name="radio-button-on" size={70} color="white" />
						) : (
							<Ionicons name="pause-circle" size={70} color="#7E22CE" />
						)} */}
						{videoUri ? (
							<TouchableOpacity className='flex-1 ' onPress={saveVideo}>
								: <Ionicons name="checkmark-circle" size={70} color="#7E22CE" />
							</TouchableOpacity>
						) : (
							<TouchableOpacity className='flex-1 ' onPress={recordVideo}>
							{!isRecording ? <Ionicons name="radio-button-on" size={70} color="white" /> : <Ionicons name="pause-circle" size={70} color="#7E22CE" />}
							</TouchableOpacity>
						)}
					</TouchableOpacity>
					<TouchableOpacity className="flex-1 items-end" onPress={toggleCameraFacing}>
						<Ionicons name="folder-open" size={24} color="white" />
					</TouchableOpacity>
				</View>
			</View>
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
	buttonContainer: {
		position: 'absolute',
		bottom: 32,
		flexDirection: 'row',
		backgroundColor: 'transparent',
		width: '100%',
		paddingHorizontal: 16,
		justifyContent: 'space-between',
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

// import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
// import { useEffect, useRef, useState } from 'react';
// import { Button, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
// import Ionicons from '@expo/vector-icons/Ionicons';
// import * as Permissions from 'expo-permissions';

// export default function App() {
// 	const [facing, setFacing] = useState<CameraType>('back');
// 	const [permission, requestPermission] = useCameraPermissions();
// 	const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
// 	const [isRecording, setIsRecording] = useState(false);
// 	const cameraRef = useRef<CameraView>(null);
// 	const [videoUri, setVideoUri] = useState<string | null>(null);


// 	useEffect(() => {
// 		(async () => {
// 			if (Platform.OS === 'android') {
// 				const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
// 				setAudioPermission(status === 'granted');
// 			} else {
// 				// iOS maneja el micrófono junto con la cámara en el permiso inicial
// 				setAudioPermission(permission?.granted || false);
// 			}
// 		})();
// 	}, [permission]);

// 	if (!permission) {
// 		return <View />;
// 	}

// 	if (!permission.granted || !audioPermission) {
// 		return (
// 			<View style={styles.container}>
// 				<Text style={styles.message}>
// 					Necesitamos tu permiso para usar la cámara y el micrófono
// 				</Text>
// 				<Button
// 					onPress={async () => {
// 						const cameraStatus = await requestPermission();
// 						if (Platform.OS === 'android' && cameraStatus.granted) {
// 							const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
// 							setAudioPermission(status === 'granted');
// 						}
// 					}}
// 					title="Otorgar permisos"
// 				/>
// 			</View>
// 		);
// 	}

// 	function toggleCameraFacing() {
// 		setFacing(current => (current === 'back' ? 'front' : 'back'));
// 	}

// 	const recordVideo = async () => {
// 		if (cameraRef.current) {
// 			if (isRecording) {
// 				setIsRecording(false);
// 				await cameraRef.current.stopRecording();
// 			} else {
// 				setIsRecording(true);
// 				try {
// 					const video = await cameraRef.current.recordAsync();
// 					console.log('Video grabado:', video.uri);
// 					setIsRecording(false); 
// 				} catch (error) {
// 					console.error('Error al grabar video:', error);
// 					setIsRecording(false);
// 					alert('Error al grabar. Verifica los permisos.');
// 				}
// 			}
// 		}
// 	};

// 	const saveVideo = () => {
// 		console.log("save video");
		
// 	}

// 	return (
// 		<View 
// 		style={styles.container}>
// 			<CameraView mode='video' ref={cameraRef}  style={styles.camera} facing={facing} />
// 			<View 
// 				style={styles.buttonContainer}
// 				>
// 				<View className='flex flex-row gap-28 -inset-8'>
// 					<View className='justify-start'>
// 						<TouchableOpacity className='flex-1' onPress={toggleCameraFacing}>
// 							<Ionicons name="folder-open" size={24} color="white" />
// 						</TouchableOpacity>
// 					</View>
// 						<View className='justify-center'>
// 							{videoUri ? (
// 								<TouchableOpacity className='flex-1 ' onPress={saveVideo}>
// 									: <Ionicons name="checkmark-circle" size={70} color="#7E22CE" />
// 								</TouchableOpacity>
// 							) : (
// 								<TouchableOpacity className='flex-1 ' onPress={recordVideo}>
// 									{!isRecording ? <Ionicons name="radio-button-on" size={70} color="white" /> : <Ionicons name="pause-circle" size={70} color="#7E22CE" />}
// 								</TouchableOpacity>
// 							)}
							
// 						</View>


					
// 					<View className='justify-end'>
// 						<TouchableOpacity className='flex-1' onPress={toggleCameraFacing}>
// 								<Ionicons name="camera-reverse-outline" size={24} color="white" />
// 						</TouchableOpacity>
// 					</View>
// 				</View>
// 			</View>
// 		</View>
// 	);
// }

// const styles = StyleSheet.create({
// 	container: {
// 		flex: 1,
// 		justifyContent: 'center',
// 	},
// 	message: {
// 		textAlign: 'center',
// 		paddingBottom: 10,
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
// 		paddingHorizontal: 64,
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

