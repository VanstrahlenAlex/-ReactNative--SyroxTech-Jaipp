import { Stack } from 'expo-router';
import "../globals.css";

export default function AuthLayout() {
	return (
		<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FB0086' } }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="signup" options={{ presentation: "modal"}}/>
		</Stack>
	);
}


