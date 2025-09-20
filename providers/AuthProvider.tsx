import React, { useState } from "react";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { Alert } from "react-native";


export const AuthContext = React.createContext({
	user: null,
	signIn: async (email: string, password: string) => {},
	signUp: async (username: string, email: string, password: string) => {},
	signOut: async () => {}
})

export const useAuth = () => React.useContext(AuthContext)

export const AuthProvider  = ({children} : {children: React.ReactNode}) => {
	const [user, setUser] = React.useState(null);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const getUser = async (id: string) => {
		const {data, error} = await supabase.from('User').select('*').eq('id', id).single();
		if (error) return console.log(error);
		setUser(data)
		router.push('/(tabs)')
	}

	const signIn = async (email: string, password: string) => {
		if (!email || !password) {
					Alert.alert('Error', 'Por favor, ingresa tu email y contraseña.');
					return;
				}
				setLoading(true); 
				try {
					const { data, error } = await supabase.auth.signInWithPassword({
						email: email.trim(),  
						password: password,
					});
		
					if (error) {
						console.error('Error en login:', error);
						let errorMessage = 'Error al iniciar sesión. Inténtalo de nuevo.';
		
						if (error.message.includes('Invalid login credentials')) {
							if (!email.includes('@')) {
								errorMessage = 'Email inválido. Verifica el formato.';
							} else {
								errorMessage = 'El email o la contraseña son incorrectos.';
							}
						} else if (error.message.includes('User not found') || error.message.includes('no such user')) {
							errorMessage = 'No existe un usuario con ese correo.';
						} else if (error.message.includes('too many requests') || error.message.includes('rate limit')) {
							errorMessage = 'Demasiados intentos. Espera unos minutos.';
						} else {
							errorMessage = error.message;  
						}
		
						Alert.alert('Error', errorMessage);
						return;  
					}
		
					if (data.user) {
						
						Alert.alert('¡Bienvenido!', 'Sesión iniciada correctamente.');
						router.push('/(tabs)'); 
					}
					getUser(data.user.id);
				} catch (err) {
					console.error('Error inesperado en login:', err);
					Alert.alert('Error', 'Problema de conexión. Verifica tu internet.');
				} finally {
					setLoading(false);  
				}
	}

	const signUp = async (username: string, email: string, password: string) => {
		const { data, error } = await supabase.auth.signUp({
			email: email,
			password: password
		})
		if (error) return console.log(error);
		if (!data.user) {
			console.log("User data is null");
			return;
		}
		const { data: userData, error: userError } = await supabase.from('User').insert({
			id: data.user.id,
			username: username,
			email: email,
		})
		if(userError) return console.log(userError)
		setUser(userData)
		router.push('/(auth)')
	}

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) return console.log(error);
		setUser(null)
		router.push('/(auth)')
	}


	React.useEffect(() => {
		const { data : authData } = supabase.auth.onAuthStateChange((event, session) => {
			if(!session) return router.push('/(auth)')
				getUser(session?.user?.id)
			console.log(session);
			
		});
		return() => {
			authData.subscription.unsubscribe();
		}
	}, [])

	

	return (
		<AuthContext.Provider value={{ user, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
	)
}