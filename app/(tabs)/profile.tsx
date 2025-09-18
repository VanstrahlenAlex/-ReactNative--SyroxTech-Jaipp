import { Link, Stack, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/providers/AuthProvider';
import { User } from '@/types/auth';
import Feather from '@expo/vector-icons/Feather';

export default function ProfileScreen() {
	const router = useRouter();
	const { user, signOut } = useAuth();
	const [loading, setLoading] = useState(true);
	const [followers, setFollowers] = useState(0);
	const [artists, setArtists] = useState(0);
	const [events, setEvents] = useState(0);

	useEffect(() => {
		// Simulación de carga de datos (reemplazar con Supabase query)
		if (user) {
			setFollowers(12);
			setArtists(5);
			setEvents(8);
			setLoading(false);
		}
	}, [user]);

	if (!user) {
		return (
			<View className="flex-1 justify-center items-center bg-black">
				<Text className="text-white text-lg">No has iniciado sesión</Text>
				<TouchableOpacity onPress={() => router.push('/(auth)')}>
					<Text className="text-[#FB0086] mt-2">Inicia sesión</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (loading) {
		return (
			<View className="flex-1 justify-center items-center">
				<ActivityIndicator size="large" color="#FFFFFF" />
			</View>
		);
	}

	return (
		<ScrollView 
			className="flex-1 bg-black"
			contentContainerStyle={{ flexGrow: 1 }}
			>
				
			<LinearGradient
				colors={['#000000', '#DB2777']}
				className="absolute inset-0"
			/>
			<Stack.Screen
				options={{
					headerShown: false,
				}}
			/>

			
			<View className="bg-black rounded-t-3xl p-6 -mt-8 pt-8">

				<View className="w-full items-center p-6 mt-20">
					<View className="bg-white rounded-full w-52 h-52 items-center justify-center mb-4 overflow-hidden shadow-md">
						<Image
							source={{ uri: user?.user_metadata?.avatar_url || 'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png' }}
							className="w-52 h-52 rounded-full border-2 border-white"
						/>
					</View>
					<Text className="text-3xl font-bold text-white mb-2">{user.user_metadata?.full_name || user.email.split('@')[0]}</Text>
					<Text className="text-gray-200 text-base mb-4">{user.email}</Text>

				</View>

				<View className="space-y-4 gap-4 bg-black">
					<TouchableOpacity
						className="flex-row items-center justify-between p-4 bg-black rounded-xl shadow-sm border-white border-2"
						onPress={() => router.push('/(tabs)/account-settings')}
					>
						<View className="flex-row items-center">
							<Feather name="heart" size={24} color="#DB2777" />
							<Text className="ml-4 text-white text-base">Mis supcripciones</Text>
						</View>
						<MaterialCommunityIcons name="chevron-right" size={24} color="#D1D5DB" />
					</TouchableOpacity>
					<TouchableOpacity
						className="flex-row items-center justify-between p-4 bg-black rounded-xl shadow-sm border-white border-2"
						onPress={() => router.push('/(tabs)/notifications')}
					>
						<View className="flex-row items-center ">
							<Feather name="dollar-sign" size={24} color="#DB2777" />
							<Text className="ml-4 text-white text-base">Historial de pagos</Text>
						</View>
						<MaterialCommunityIcons name="chevron-right" size={24} color="#D1D5DB" />
					</TouchableOpacity>
					<TouchableOpacity
						className="flex-row items-center justify-between p-4 bg-black rounded-xl shadow-sm border-white border-2"
						onPress={() => router.push('/(tabs)/favorite-artists')}
					>
						<View className="flex-row items-center">
							<Feather name="credit-card" size={24} color="#DB2777" />
							<Text className="ml-4 text-white text-base">Métodos de Pago</Text>
						</View>
						<MaterialCommunityIcons name="chevron-right" size={24} color="#D1D5DB" />
					</TouchableOpacity>
					<TouchableOpacity
						className="flex-row items-center justify-between p-4 bg-black rounded-xl shadow-sm border-white border-2"
						onPress={() => router.push('/(tabs)/help-support')}
					>
						<View className="flex-row items-center">
							<MaterialCommunityIcons name="help-circle-outline" size={24} color="#DB2777" />
							<Text className="ml-4 text-white text-base">Ayuda y Soporte</Text>
						</View>
						<MaterialCommunityIcons name="chevron-right" size={24} color="#D1D5DB" />
					</TouchableOpacity>
				</View>

				<TouchableOpacity
					className="flex-row items-center justify-center p-4 rounded-lg mt-8 border-2 border-red-500"
					onPress={async () => {
						await signOut();
						router.push('/(auth)');
					}}
				>
					<MaterialCommunityIcons name="logout" size={24} color="#EF4444" />
					<Text className="ml-2 text-red-500 text-lg font-semibold">Cerrar Sesión</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}