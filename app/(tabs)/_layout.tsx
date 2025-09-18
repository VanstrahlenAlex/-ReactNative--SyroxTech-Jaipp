import { Tabs } from "expo-router";
import { Text, Image, View } from "react-native";
import "../globals.css";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import jaippLogo from "../../assets/jaipp_logo.png";

//const FansIcon = require('../../assets/jaipp-logo.png');

export default function TabsLayout() {
	
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: "#FB0086",
				tabBarInactiveTintColor: "#a8a29e", 
				headerShown: false,
				tabBarStyle: {
					backgroundColor: "black",
					height: 80, 
					borderTopWidth: 0,
				},
				tabBarLabelStyle: {
					fontSize: 12,
					marginBottom: 10,
				},
				
				
			}}
		>
			<Tabs.Screen 
				name="index"
				options={{ title: "Home",
					tabBarIcon: ({ color, size }) => (<MaterialCommunityIcons name="home-variant-outline" size={size} color={color} />),
					tabBarLabel: ({ color }) => <Text style={{ color }}>Home</Text>,
				}} />

			<Tabs.Screen
				name="artist"
				options={{
					title: "Artistas",
					tabBarIcon: ({ color, size }) => (<FontAwesome name="microphone" size={size} color={color} />)
				}} />

			<Tabs.Screen
				name="fans"
				options={{
					title: "Fans",
					tabBarIcon: ({ focused }) => (
						<View className={`absolute -top-6 w-20 h-20 rounded-full items-center justify-center ${focused ? 'bg-primary-pink' : 'bg-gray-200'}`}>
							<Image
								source={focused ? jaippLogo : jaippLogo }
								style={{ width: 28, height: 48 }}
							/>
							<Text
								className={` ${focused ? 'text-gray-400' :'text-primary-pink' }`}
								style={{ fontSize: 12 }}
							>
								Fans
							</Text>
						</View>
					),
					
					// tabBarLabel: ({ focused }) => (
					// 	<Text
					// 		className={`mt-10 font-bold ${focused ? 'text-primary-pink' : 'text-gray-400'}`}
					// 		style={{ fontSize: 12 }}
					// 	>
					// 		Fans
					// 	</Text>
					// ),
				}}
			/>

			<Tabs.Screen
				name="feed"
				options={{
					title: "Feed",
					tabBarIcon: ({ color, size }) => (<FontAwesome5 name="bullhorn" size={size} color={color} />)
				}} />

			<Tabs.Screen
				name="profile"
				options={{
					title: "Perfil",
					tabBarIcon: ({ color, size }) => <FontAwesome5 name="user-alt" size={size} color={color} />
				}} />
		</Tabs>
	);
}
