import { Stack } from "expo-router";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";

export default function RootLayout() {
	return (
		<AuthProvider>
			<Stack >
				<Stack.Screen
					name={"(auth)"}
					options={{ headerShown: false }}
				/>
					<Stack.Screen
						name={"(tabs)"}
						options={{ headerShown: false }}
					/>
				<Stack.Screen
					name={"camera"}
					options={{ headerShown: false, presentation: 'modal' }}
				/>
			</Stack>
		</AuthProvider>
		);
}
