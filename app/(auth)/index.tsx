import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, Image, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider';
import React from 'react';


export default function IndexAuth() {
	// const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);

	const {signIn} = useAuth();



	return (
		<View className="flex-1">
			<LinearGradient
				colors={['#7E22CE', '#DB2777']}
				className="absolute inset-0"
			/>

			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === 'android' ? 'padding' : 'height'}
			>
				<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
					<View className="items-center z-10 p-4">
						<View className="bg-white rounded-full w-40 h-40 items-center justify-center mb-6">
							<Image
								source={require('../../assets/jaipp_white_bg.png')}
								className="w-20 h-10"
							/>
						</View>
						<Text className="text-2xl font-bold mb-2 text-white text-center">Inicia Sesión en tu Cuenta</Text>
					</View>

					<View className="bg-white rounded-3xl p-8 w-full max-w-sm mx-auto z-20 shadow-lg mt-8">
						<Text className="text-gray-500 mb-6 text-center">Inicia Sesión</Text>
						<TextInput
							placeholder="Email"
							className="bg-gray-100 p-4 rounded-lg border border-gray-300 w-full mb-4"
							value={email}
							onChangeText={setEmail}
							keyboardType="email-address"
							autoCapitalize="none"
							editable={!loading}  
						/>
						<TextInput
							secureTextEntry={true}
							placeholder="Password"
							className="bg-gray-100 p-4 rounded-lg border border-gray-300 w-full mb-4"
							value={password}
							onChangeText={setPassword}
							editable={!loading}
						/>

						<TouchableOpacity
							className="w-full mb-4 rounded-lg overflow-hidden"
							onPress={() => signIn(email, password)}
							disabled={loading} 
						>
							<LinearGradient
								colors={['#DB2777', '#7E22CE']}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								className="p-4 items-center"
							>
								<Text className="text-white font-bold text-lg">
									{loading ? 'Iniciando...' : 'Iniciar sesión'}
								</Text>
							</LinearGradient>
						</TouchableOpacity>

						<View className="flex-row justify-center">
							<Text className="text-gray-500">¿No tienes una cuenta?</Text>
							<Link href="/(auth)/signup" asChild>
								<TouchableOpacity>
									<Text className="text-[#FB0086] ml-1 font-bold">Regístrate</Text>
								</TouchableOpacity>
							</Link>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

// import { Link, useRouter } from 'expo-router';
// import { useState } from 'react';
// import { Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';

// export default function IndexAuth() {
// 	const router = useRouter();
// 	const [email, setEmail] = useState('');
// 	const [password, setPassword] = useState('');

// 	return (
// 		<View className="flex-1">
// 			<LinearGradient
// 				colors={['#7E22CE', '#DB2777']}
// 				className="absolute inset-0"
// 			/>
// 			<View className="flex-1 justify-center items-center">
// 				{/* Contenedor para la imagen y el texto de bienvenida */}
// 				<View className="items-center z-10 p-4">
// 					<View className="bg-white rounded-full w-40 h-40 items-center justify-center mb-6">
// 						<Image
// 							source={require('../../assets/jaipp_white_bg.png')}
// 							className="w-20 h-10 "
// 						/>
// 					</View>
// 					<Text className="text-2xl font-bold mb-2 text-white text-center">Inicia Sesión en tu Cuenta</Text>
// 				</View>

// 				{/* Formulario de inicio de sesión, centrado y con fondo blanco */}
// 				<View className="bg-white rounded-3xl p-8 w-full max-w-sm mx-auto z-20 shadow-lg">
// 					<Text className="text-gray-500 mb-6 text-center">Inicia Sesión</Text>
// 					<TextInput
// 						placeholder="Email"
// 						className="bg-gray-100 p-4 rounded-lg border border-gray-300 w-full mb-4"
// 						value={email}
// 						onChangeText={setEmail}
// 						keyboardType="email-address"
// 						autoCapitalize="none"
// 					/>
// 					<TextInput
// 						secureTextEntry={true}
// 						placeholder="Password"
// 						className="bg-gray-100 p-4 rounded-lg border border-gray-300 w-full mb-4"
// 						value={password}
// 						onChangeText={setPassword}
// 					/>

// 					{/* Botón con degradado */}
// 					<TouchableOpacity className="w-full mb-4 rounded-lg overflow-hidden">
// 						<LinearGradient
// 							colors={['#DB2777', '#7E22CE']}
// 							start={{ x: 0, y: 0 }}
// 							end={{ x: 1, y: 1 }}
// 							className="p-4 items-center"
// 						>
// 							<Text className="text-white font-bold text-lg">Iniciar sesión</Text>
// 						</LinearGradient>
// 					</TouchableOpacity>

// 					<View className="flex-row justify-center">
// 						<Text className="text-gray-500">¿No tienes una cuenta?</Text>
// 						<Link href="/(auth)/signup" asChild>
// 							<TouchableOpacity>
// 								<Text className="text-[#FB0086] ml-1 font-bold">Regístrate</Text>
// 							</TouchableOpacity>
// 						</Link>
// 					</View>
// 				</View>
// 			</View>
// 		</View>
// 	);
// }


