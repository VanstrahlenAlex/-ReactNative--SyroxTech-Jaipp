import { useAuth } from "@/providers/AuthProvider";
import { User } from "@/types/auth";
import { Text, View } from "react-native";

export default function Index() {
	const { user } = useAuth();
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">Welcome to the Jaipp App</Text>
      {user && <Text className="text-lg">Hello, {(user as User).username}!</Text>}
    </View>
  );
}
