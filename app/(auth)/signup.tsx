import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// Importaciones para el selector de país
import CountryPicker, { Country, CountryCode, TranslationLanguageCodeMap } from 'react-native-country-picker-modal';
import { supabase } from '@/utils/supabase';

export default function SignUpScreen() {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phoneNumber, setPhoneNumber] = useState('');
	const [password, setPassword] = useState('');
	const [passwordRepeat, setPasswordRepeat] = useState('');
	const [dateOfBirth, setDateOfBirth] = useState(new Date());
	const [country, setCountry] = useState<Country | null>(null);
	const [acceptPrivacy, setAcceptPrivacy] = useState(false);
	const [acceptTerms, setAcceptTerms] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [countryCode, setCountryCode] = useState<CountryCode>('AR');
	const [withFilter, setWithFilter] = useState(true);
	const [loading, setLoading] = useState(false);

	const router = useRouter();

	const onDateChange = (event: DateTimePickerEvent, selectedDate: Date | undefined) => {
		const currentDate = selectedDate || dateOfBirth;
		setShowDatePicker(Platform.OS === 'ios');
		setDateOfBirth(currentDate);
	};

	const onSelectCountry = (selectedCountry: Country) => {
		setCountryCode(selectedCountry.cca2);
		setCountry(selectedCountry);
	};

	const handleSignup = async () => {
		if (loading) return;
		if (password !== passwordRepeat) {
			alert('Las contraseñas no coinciden');
			return;
		}
		if (!acceptTerms || !acceptPrivacy) {
			alert('Debes aceptar términos y privacidad');
			return;
		}

		try {
			const { data: authData, error: authError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {  
						full_name: name, 
					},
				},
			});

			if (authError) {
				if (authError.message.includes('after')) {
					alert('Demasiados intentos. Espera 60 segundos e inténtalo de nuevo.');
				} else {
					throw authError;
				}
				return; 
			}

			const { data: existing } = await supabase.from('User').select('id').eq('username', name).single();
			if (existing) {
				alert('Usuario ya existe');
				return;
			}

			if (authData.user) {
				const { error: profileError } = await supabase
					.from('User')  
					.insert({
						id: authData.user.id,  
						username: name.trim().toLowerCase(), 
						email,
						phone: phoneNumber,
						date_of_birth: dateOfBirth.toISOString().split('T')[0], 
						country_code: country?.cca2 || countryCode,  
						created_at: new Date().toISOString(),
					});

				if (profileError) {
					if (profileError.code === '23505') {
						alert('El nombre de usuario ya existe. Elige otro.');
					} else {
						throw profileError;
					}
					return;
				}

				alert('¡Cuenta creada exitosamente!');
				router.push('/(auth)');  
			}
		} catch (error : any) {
			console.error('Error en signup:', error);
			alert('Error al crear cuenta: ' + error.message);
		}
	};

	return (
		<View className="flex-1">

			<LinearGradient
				colors={['#7E22CE', '#DB2777']}
				className="absolute inset-0"
			/>

			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
					<View className="items-center z-10 p-4">
						<View className="bg-primary-pink rounded-full w-40 h-40 items-center justify-center mb-6">
							<Feather name="music" size={64} color="white" />
						</View>
						<Text className="text-4xl font-bold mb-2 text-white text-center">¡Únete como Fan!</Text>
					</View>

					<View className="w-full max-w-sm mx-auto p-8 bg-white rounded-t-3xl shadow-lg">
						<Text className="text-gray-500 mb-6 text-center font-bold text-lg">Accede a contenido exclusivo de tus artistas favoritos</Text>
						<View className="mb-4">
							<Text className="text-sm text-gray-700">Nombre Completo</Text>
							<TextInput
								placeholder="Ingresa tu nombre completo"
								className="bg-gray-100 p-4 rounded-lg border border-gray-300 w-full"
								value={name}
								onChangeText={setName}
							/>
						</View>
						<View className="mb-4">
							<Text className="text-sm text-gray-700">Correo electrónico</Text>
							<TextInput
								placeholder="Ingresa tu correo electrónico"
								className="bg-gray-100 p-4 rounded-lg border border-gray-300 w-full"
								value={email}
								onChangeText={setEmail}
								keyboardType="email-address"
								autoCapitalize="none"
							/>
						</View>
						<View className="mb-4">
							<Text className="text-sm text-gray-700">Número de teléfono</Text>
							<TextInput
								placeholder="+54 7651 547127"
								className="bg-gray-100 p-4 rounded-lg border border-gray-300 w-full"
								value={phoneNumber}
								onChangeText={setPhoneNumber}
								keyboardType="phone-pad"
							/>
						</View>
						<View className="mb-4">
							<Text className="text-sm text-gray-700">Contraseña</Text>
							<TextInput
								secureTextEntry={true}
								placeholder="Crea una contraseña"
								className="bg-gray-100 p-4 rounded-lg border border-gray-300 w-full"
								value={password}
								onChangeText={setPassword}
							/>
						</View>
						<View className="mb-4">
							<Text className="text-sm text-gray-700">Confirmar Contraseña</Text>
							<TextInput
								secureTextEntry={true}
								placeholder="Repite tu contraseña"
								className="bg-gray-100 p-4 rounded-lg border border-gray-300 w-full"
								value={passwordRepeat}
								onChangeText={setPasswordRepeat}
							/>
						</View>
						<View className="mb-4">
							<Text className="text-sm text-gray-700">Fecha de Nacimiento</Text>
							<TouchableOpacity
								onPress={() => setShowDatePicker(true)}
								className="bg-gray-100 p-4 rounded-lg border border-gray-300 w-full"
							>
								<Text>{dateOfBirth.toLocaleDateString()}</Text>
							</TouchableOpacity>
							{showDatePicker && (
								<DateTimePicker
									value={dateOfBirth}
									mode="date"
									display="default"
									onChange={onDateChange}
								/>
							)}
						</View>

						<View className="mb-4">
							<Text className="text-sm text-gray-700">País</Text>
							<CountryPicker
								{...{
									countryCode: countryCode,
									withFilter,
									withFlag: true,
									withCountryNameButton: true,
									withAlphaFilter: true,
									withCallingCode: true,
									onSelect: onSelectCountry,
									withEmoji: true,
									containerButtonStyle: {
										backgroundColor: '#f3f4f6',
										padding: 16,
										borderRadius: 8,
										borderWidth: 1,
										borderColor: '#d1d5db',
										width: '100%',
									},
									translation: 'spa' as TranslationLanguageCodeMap,
								}}

							/>
						</View>
						
					<View className="flex-row items-center mb-4">
 							<TouchableOpacity
 								className={`w-6 h-6 rounded border-2 mr-2 justify-center items-center ${acceptPrivacy ? 'bg-[#DB2777] border-[#DB2777]' : 'border-gray-400'}`}
 								onPress={() => setAcceptPrivacy(!acceptPrivacy)}
 							>
 								{acceptPrivacy && <Feather name="check" size={16} color="white" />}
 							</TouchableOpacity>
 							<Text className="flex-1 text-gray-700 text-sm">Acepto los <Text className='text-primary-pink'>términos y condiciones </Text>
 								y la <Text className='text-primary-pink'>política de privacidad</Text>
 							</Text>
 						</View>
						 						<View className="flex-row items-center mb-6">
 							<TouchableOpacity
 								className={`w-6 h-6 rounded border-2 mr-2 justify-center items-center ${acceptTerms ? 'bg-[#DB2777] border-[#DB2777]' : 'border-gray-400'}`}
 								onPress={() => setAcceptTerms(!acceptTerms)}
 							>
 								{acceptTerms && <Feather name="check" size={16} color="white" />}
 							</TouchableOpacity>
 							<Text className="flex-1 text-gray-700 text-sm">Quiero recibir noticias y ofertas especiales por email</Text>
 						</View>

						<TouchableOpacity
							className="rounded-lg w-full mb-4 overflow-hidden"
							onPress={handleSignup}
						>
							<LinearGradient
								colors={['#DB2777', '#7E22CE']}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								className="p-4 items-center"
							>
								<Text
									className="text-white font-bold text-lg text-center">
									Crear Cuenta Fan
								</Text>
							</LinearGradient>
						</TouchableOpacity>


						<TouchableOpacity className="w-full rounded-lg overflow-hidden border-2 border-transparent">
						 	<View className='bg-blue-200 p-4 '>
						 		<Text className=" text-blue-950 text-lg">¿Eres Artista?</Text>
						 		<Text className=" text-blue-700 text-xs">Los Artistas deben pasar por un proceso de verificación especial para garantizar la autenticidad</Text>
						 		<LinearGradient
						 			colors={['#F5F5F5', '#F5F5F5']} 
						 			start={{ x: 1, y: 0 }}
						 			end={{ x: 0, y: 0 }}
						 			className="p-2 mt-4 items-center rounded-lg overflow-hidden"
						 		>
						 				<Text className="font-bold text-blue-700 text-lg ">Solicitar verificación de Artista</Text>
						 		</LinearGradient>
						 	</View>
						 </TouchableOpacity>

						<View className="flex-row justify-center mt-4">
							<Text className="text-gray-500">¿Ya tienes una cuenta?</Text>
							<Link href="/" className="text-primary-pink font-bold ml-1">Inicia sesión</Link>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}
