import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	FlatList,
	Image,
	Dimensions,
	Pressable,
	ScrollView,
	ViewToken,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { supabase } from "@/utils/supabase";
import AntDesign from '@expo/vector-icons/AntDesign';

type Artist = {
	id: string;
	name: string;
	avatar_url?: string | null;
	cover_url?: string | null;
	verified?: boolean | null;
};

type EventItem = {
	id: string;
	title: string;
	city: string;
	country: string;
	cover_url: string;
	date: string; 
	followers: string; 
};

const { width: SCREEN_W } = Dimensions.get("window");
const HERO_H = 190;
const BIG_CARD_W = SCREEN_W - 24;
const BIG_CARD_H = 360;

export default function Index() {
	const [artists, setArtists] = useState<Artist[]>([]);
	const [activeSlide, setActiveSlide] = useState(0);
	const [tab, setTab] = useState<"artists" | "events">("artists");

	useEffect(() => {
		(async () => {
			const { data, error } = await supabase
				.from("Artist")
				.select("id,name,avatar_url,cover_url,verified")
				.order("created_at", { ascending: false });
			if (!error) setArtists((data ?? []) as Artist[]);
		})();
	}, []);

	const onViewableItemsChanged = useRef(
		({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
			if (viewableItems?.length) {
				const idx = viewableItems[0].index ?? 0;
				setActiveSlide(idx);
			}
		}
	);

	const viewabilityConfig = { itemVisiblePercentThreshold: 70 };
	const featured = useMemo(() => artists.slice(0, 5), [artists]);

	return (
		<SafeAreaView className="flex-1 bg-[#0F0F0F]">
			{/* HEADER */}
			<View className="px-4 py-2 flex-row items-center justify-between">
				<Text className="text-white font-extrabold text-2xl">Jaipp</Text>
				<Pressable
					className="flex-row items-center gap-2"
					onPress={() => Alert.alert("Cuenta", "Función en demo")}
				>
					<Ionicons name="person-add-outline" size={16} color="#FF2D55" />
					<Text className="text-[#FF2D55] font-semibold">Crear cuenta</Text>
				</Pressable>
			</View>

			<ScrollView
				contentContainerStyle={{ paddingBottom: 28 }}
				showsVerticalScrollIndicator={false}
			>
				{/* HERO */}
				<View className="px-3">
					<View className="rounded-2xl overflow-hidden" style={{ height: HERO_H }}>
						<Image
							source={{
								uri:
									"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop",
							}}
							className="w-full h-full"
						/>
						<LinearGradient
							colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.65)"]}
							locations={[0.3, 1]}
							className="absolute inset-0"
						/>
						<View className="absolute inset-0 p-4 justify-between">
							<View className="pt-1">
								<Text className="text-white font-extrabold text-xl leading-6">
									Descubre nuevos artistas{"\n"}y eventos
								</Text>
								<Text className="text-white/80 mt-2 leading-5">
									Explora la mejor música urbana y conecta{"\n"}con tus artistas favoritos
								</Text>
							</View>
							<Pressable
								onPress={() => router.push("/(tabs)/artist")}
								className="self-start bg-[#FF2D55] py-2 px-4 rounded-full"
							>
								<Text className="text-white font-bold">Ver Artistas</Text>
							</Pressable>
						</View>
					</View>

					{/* TABS reales */}
					<View className="flex-row mt-3">
						<Pressable onPress={() => setTab("artists")}>
							<Text
								className={`mr-6 pb-1 font-bold ${tab === "artists"
										? "text-[#FF2D55] border-b-2 border-[#FF2D55]"
										: "text-white/60"
									}`}
							>
								ARTISTAS
							</Text>
						</Pressable>

						<Pressable onPress={() => setTab("events")}>
							<Text
								className={`pb-1 font-bold ${tab === "events"
										? "text-[#FF2D55] border-b-2 border-[#FF2D55]"
										: "text-white/60"
									}`}
							>
								EVENTOS
							</Text>
						</Pressable>
					</View>
				</View>

				{/* --- TAB: ARTISTAS --- */}
				{tab === "artists" && (
					<>
						{/* CARRUSEL GRANDE */}
						<View className="mt-4">
							<FlatList
								horizontal
								pagingEnabled
								showsHorizontalScrollIndicator={false}
								snapToAlignment="center"
								decelerationRate="fast"
								contentContainerStyle={{ paddingHorizontal: 12 }}
								data={featured.length ? featured : [null, null, null]}
								keyExtractor={(_, i) => `big-${i}`}
								renderItem={({ item }) => (
									<BigArtistCard
										width={BIG_CARD_W}
										height={BIG_CARD_H}
										artist={item ? (item as Artist) : undefined}
									/>
								)}
								onViewableItemsChanged={onViewableItemsChanged.current}
								viewabilityConfig={viewabilityConfig}
							/>

							{/* DOTS */}
							<View className="flex-row items-center justify-center gap-2 mt-2">
								{(featured.length ? featured : [0, 1, 2]).map((_, i) => (
									<View
										key={`dot-${i}`}
										className={`rounded-full ${i === activeSlide ? "bg-[#FF2D55]" : "bg-white/30"
											}`}
										style={{ width: 8, height: 8 }}
									/>
								))}
							</View>
						</View>

						{/* ARTISTAS DESTACADOS */}
						<View className="mt-5">
							<Text className="text-white font-extrabold text-lg px-4">
								Artistas destacados
							</Text>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
							>
								{artists.map((a) => (
									<Pressable
										key={a.id}
										onPress={() => router.push("/(tabs)/artist")}
										className="items-center mr-4"
									>
										<Image
											source={{
												uri:
													a.avatar_url ??
													"https://placehold.co/120x120/png?text=Artist",
											}}
											className="w-16 h-16 rounded-full bg-[#1f1f1f]"
										/>
										<Text
											numberOfLines={1}
											className="text-white mt-2 text-xs max-w-16 text-center"
										>
											{a.name}
										</Text>
									</Pressable>
								))}
								{!artists.length && (
									<Text className="text-white/60 px-2">Cargando…</Text>
								)}
							</ScrollView>
						</View>

						{/* MÁS ESCUCHADAS (DEMO) */}
						<View className="mt-1 px-3">
							<Text className="text-white font-extrabold text-lg mb-3">
								Más escuchadas
							</Text>
							{TOP_SONGS.map((song, idx) => (
								<View
									key={song.id}
									className={`flex-row items-center rounded-xl px-3 py-3 mb-2 ${idx === 0
											? "bg-[#FF2D55]/15 border border-[#FF2D55]/40"
											: "bg-[#1A1A1A]"
										}`}
								>
									<Text className="text-white/60 w-6 text-center">{idx + 1}</Text>
									<Image
										source={{ uri: song.cover }}
										className="w-10 h-10 rounded-md bg-[#2a2a2a] mr-3"
									/>
									<View className="flex-1">
										<Text className="text-white font-semibold" numberOfLines={1}>
											{song.title}
										</Text>
										<Text className="text-white/60 text-xs" numberOfLines={1}>
											{song.artist}
										</Text>
									</View>
									<View className="flex-row items-center gap-2">
										<AntDesign name="spotify" size={24} color="#1DB954" />
										<Text className="text-white/80 text-xs">{song.plays}</Text>
									</View>
								</View>
							))}
						</View>
					</>
				)}

				{/* --- TAB: EVENTOS --- */}
				{tab === "events" && (
					<>
						{/* Carrusel/Lista de festivales */}
						<View className="mt-4 px-3">
							<FlatList
								data={EVENTS}
								keyExtractor={(e) => e.id}
								renderItem={({ item }) => <EventCard event={item} />}
								ItemSeparatorComponent={() => <View className="h-3" />}
								scrollEnabled={false}
							/>
						</View>

						
						<View className="mt-4 px-3">
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={{ paddingRight: 8 }}
							>
								{EVENTS.map((e) => (
									<MiniEventCard key={`mini-${e.id}`} event={e} />
								))}
							</ScrollView>
						</View>
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

/* --- COMPONENTES --- */

function BigArtistCard({
	artist,
	width,
	height,
}: {
	artist?: Artist;
	width: number;
	height: number;
}) {
	const img =
		artist?.cover_url ??
		"https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?q=80&w=1400&auto=format&fit=crop";

	return (
		<View
			className="rounded-2xl overflow-hidden mr-3 bg-[#121212]"
			style={{ width, height }}
		>
			<Image source={{ uri: img }} className="w-full h-full" />
			<LinearGradient
				colors={["rgba(255,45,85,0.0)", "rgba(255,45,85,0.25)", "rgba(0,0,0,0.85)"]}
				locations={[0, 0.42, 1]}
				className="absolute inset-0"
			/>
			<View className="absolute left-4 right-4 bottom-4">
				<Text className="text-white font-extrabold text-2xl">
					{artist?.name ?? "Artista"}
				</Text>
				<Text className="text-white/70">Trap/R&B</Text>
			</View>
		</View>
	);
}

function EventCard({ event }: { event: EventItem }) {
	const dt = new Date(event.date);
	const month = MONTHS[dt.getMonth()];
	const day = dt.getDate();

	return (
		<View className="rounded-2xl overflow-hidden bg-[#181818]">
			<View className="p-3">
				<Text className="text-white font-semibold" numberOfLines={1}>
					{event.title}
				</Text>
				<Text className="text-white/70 text-xs">
					{event.city}, {event.country}
				</Text>
			</View>

			<View className="px-3">
				<View className="rounded-xl overflow-hidden">
					<Image source={{ uri: event.cover_url }} className="w-full h-28" />
					<LinearGradient
						colors={["rgba(255,45,85,0.15)", "rgba(0,0,0,0.6)"]}
						className="absolute inset-0"
					/>
					{/* Fila superior: asistentes + seguidores */}
					<View className="absolute left-2 right-2 top-2 flex-row justify-between items-center">
						<View className="flex-row">
							<View className="w-5 h-5 rounded-full bg-white/70 mr-1" />
							<View className="w-5 h-5 rounded-full bg-white/60 mr-1" />
							<View className="w-5 h-5 rounded-full bg-white/50" />
						</View>
						<Text className="text-white/80 text-xs">{event.followers}</Text>
					</View>
				</View>
			</View>

			{/* CTA + fecha + dots */}
			<View className="px-3 pt-2 pb-3">
				<View className="flex-row items-center">
					<View className="w-12 h-12 rounded-xl bg-[#7B2CFF] items-center justify-center mr-3">
						<Text className="text-white text-[10px] font-black">{month}</Text>
						<Text className="text-white font-extrabold">{day}</Text>
					</View>

					<Pressable
						onPress={() => Alert.alert("Evento", event.title)}
						className="flex-1 bg-[#FF2D55] py-2 rounded-xl items-center"
					>
						<Text className="text-white font-semibold">Ver Evento</Text>
					</Pressable>
				</View>

				<View className="flex-row items-center justify-center gap-2 mt-2">
					<View className="w-2 h-2 rounded-full bg-white/60" />
					<View className="w-2 h-2 rounded-full bg-white/30" />
					<View className="w-2 h-2 rounded-full bg-white/30" />
				</View>
			</View>
		</View>
	);
}

function MiniEventCard({ event }: { event: EventItem }) {
	const dt = new Date(event.date);
	const month = MONTHS[dt.getMonth()];
	const day = dt.getDate();

	return (
		<View className="mr-3 w-[280px] rounded-2xl overflow-hidden bg-[#181818]">
			<View className="p-3">
				<Text className="text-white text-xs font-semibold" numberOfLines={1}>
					{event.title}
				</Text>
				<Text className="text-white/70 text-[11px]">
					{event.city}, {event.country}
				</Text>
			</View>
			<View className="px-3">
				<View className="rounded-xl overflow-hidden">
					<Image source={{ uri: event.cover_url }} className="w-full h-20" />
					<LinearGradient
						colors={["rgba(255,45,85,0.15)", "rgba(0,0,0,0.6)"]}
						className="absolute inset-0"
					/>
				</View>
			</View>
			<View className="px-3 pt-2 pb-3">
				<View className="flex-row items-center">
					<View className="w-10 h-10 rounded-xl bg-[#7B2CFF] items-center justify-center mr-3">
						<Text className="text-white text-[9px] font-black">{month}</Text>
						<Text className="text-white font-extrabold text-sm">{day}</Text>
					</View>
					<Pressable
						onPress={() => Alert.alert("Evento", event.title)}
						className="flex-1 bg-[#FF2D55] py-2 rounded-xl items-center"
					>
						<Text className="text-white text-xs font-semibold">Ver Evento</Text>
					</Pressable>
				</View>
				<View className="flex-row items-center justify-center gap-1 mt-2">
					<View className="w-1.5 h-1.5 rounded-full bg-white/60" />
					<View className="w-1.5 h-1.5 rounded-full bg-white/30" />
					<View className="w-1.5 h-1.5 rounded-full bg-white/30" />
				</View>
			</View>
		</View>
	);
}

/* --- DATA DEMO --- */
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const EVENTS: EventItem[] = [
	{
		id: "e1",
		title: "Festival SURFESTIVAL 2025",
		city: "Santiago",
		country: "Chile",
		cover_url:
			"https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1400&auto=format&fit=crop",
		date: "2025-07-15",
		followers: "+2.5K seguidores",
	},
	{
		id: "e2",
		title: "Festival Reggaeton Night 2025",
		city: "Santiago",
		country: "Chile",
		cover_url:
			"https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?q=80&w=1400&auto=format&fit=crop",
		date: "2025-07-22",
		followers: "+2.5K seguidores",
	},
	{
		id: "e3",
		title: "Festival De Cora Fest 2025",
		city: "Buenos Aires",
		country: "Argentina",
		cover_url:
			"https://images.unsplash.com/photo-1542773995-8c84abfe0df6?q=80&w=1400&auto=format&fit=crop",
		date: "2025-08-10",
		followers: "+2.1K seguidores",
	},
];

const TOP_SONGS = [
	{
		id: "1",
		title: "Mambinho Brasileño",
		artist: "benjitalkapone",
		cover:
			"https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=400&auto=format&fit=crop",
		plays: "280K",
	},
	{
		id: "2",
		title: "QLOO*",
		artist: "Young Cister, Kreamly",
		cover:
			"https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop",
		plays: "259K",
	},
	{
		id: "3",
		title: "Who",
		artist: "Jimin",
		cover:
			"https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?q=80&w=400&auto=format&fit=crop",
		plays: "232K",
	},
	{
		id: "4",
		title: "y ke pa - Remix",
		artist: "Julianino Sosa, benjitalkapone, Jairo Vera",
		cover:
			"https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=400&auto=format&fit=crop",
		plays: "217K",
	},
	{
		id: "5",
		title: "La Plena - W Sound…",
		artist: "W Sound, Beéle, Ovy On The Drums",
		cover:
			"https://images.unsplash.com/photo-1509326068474-61ebd2f4c1d1?q=80&w=400&auto=format&fit=crop",
		plays: "213K",
	},
	{
		id: "6",
		title: "no tiene sentido",
		artist: "Beéle",
		cover:
			"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=400&auto=format&fit=crop",
		plays: "191K",
	},
	{
		id: "7",
		title: "Somos Diferentes…",
		artist: "Nickoog Clk, Jere Klein, Katteyes, Juanka",
		cover:
			"https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop",
		plays: "178K",
	},
];



// import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
// 	View,
// 	Text,
// 	FlatList,
// 	Image,
// 	Dimensions,
// 	Pressable,
// 	ScrollView,
// 	ViewToken,
// 	Alert,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { LinearGradient } from "expo-linear-gradient";
// import Ionicons from "@expo/vector-icons/Ionicons";
// import { router } from "expo-router";
// import { supabase } from "@/utils/supabase";

// type Artist = {
// 	id: string;
// 	name: string;
// 	avatar_url?: string | null;
// 	cover_url?: string | null;
// 	verified?: boolean | null;
// };

// const { width: SCREEN_W } = Dimensions.get("window");
// const HERO_H = 190;
// const BIG_CARD_W = SCREEN_W - 24; // padding 12 a los lados
// const BIG_CARD_H = 360;

// export default function Index() {
// 	const [artists, setArtists] = useState<Artist[]>([]);
// 	const [loading, setLoading] = useState(true);
// 	const [activeSlide, setActiveSlide] = useState(0);

// 	useEffect(() => {
// 		(async () => {
// 			const { data, error } = await supabase
// 				.from("Artist")
// 				.select("id,name,avatar_url,cover_url,verified")
// 				.order("created_at", { ascending: false });

// 			if (error) {
// 				console.log(error);
// 			} else {
// 				setArtists((data ?? []) as Artist[]);
// 			}
// 			setLoading(false);
// 		})();
// 	}, []);

// 	const onViewableItemsChanged = useRef(
// 		({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
// 			if (viewableItems?.length) {
// 				const idx = viewableItems[0].index ?? 0;
// 				setActiveSlide(idx);
// 			}
// 		}
// 	);

// 	const viewabilityConfig = useMemo(
// 		() => ({ itemVisiblePercentThreshold: 70 }),
// 		[]
// 	);

// 	const featured = useMemo(() => artists.slice(0, 5), [artists]);

// 	return (
// 		<SafeAreaView className="flex-1 bg-[#0F0F0F]">
// 			{/* HEADER */}
// 			<View className="px-4 py-2 flex-row items-center justify-between">
// 				<Text className="text-white font-extrabold text-2xl">Jaipp</Text>
// 				<Pressable
// 					className="flex-row items-center gap-2"
// 					onPress={() => Alert.alert("Cuenta", "Función en demo")}
// 				>
// 					<Ionicons name="person-add-outline" size={16} color="#FF2D55" />
// 					<Text className="text-[#FF2D55] font-semibold">Crear cuenta</Text>
// 				</Pressable>
// 			</View>

// 			<ScrollView
// 				contentContainerStyle={{ paddingBottom: 28 }}
// 				showsVerticalScrollIndicator={false}
// 			>
// 				{/* HERO - Noticias/Eventos */}
// 				<View className="px-3">
// 					<View
// 						className="rounded-2xl overflow-hidden"
// 						style={{ height: HERO_H }}
// 					>
// 						<Image
// 							source={{
// 								uri:
// 									"https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1600&auto=format&fit=crop",
// 							}}
// 							className="w-full h-full"
// 						/>
// 						<LinearGradient
// 							colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.6)"]}
// 							locations={[0.3, 1]}
// 							className="absolute inset-0"
// 						/>
// 						<View className="absolute inset-0 p-4 justify-between">
// 							<View className="pt-1">
// 								<Text className="text-white font-extrabold text-xl leading-6">
// 									Descubre nuevos artistas{"\n"}y eventos
// 								</Text>
// 								<Text className="text-white/80 mt-2 leading-5">
// 									Explora la mejor música urbana y conecta{"\n"}con tus artistas favoritos
// 								</Text>
// 							</View>

// 							<Pressable
// 								onPress={() => router.push("/(tabs)/artist")}
// 								className="self-start bg-[#FF2D55] py-2 px-4 rounded-full"
// 							>
// 								<Text className="text-white font-bold">Ver Artistas</Text>
// 							</Pressable>
// 						</View>
// 					</View>

// 					{/* Tabs (estático visual) */}
// 					<View className="flex-row mt-3">
// 						<Text className="text-[#FF2D55] font-bold mr-6 border-b-2 border-[#FF2D55] pb-1">
// 							ARTISTAS
// 						</Text>
// 						<Text className="text-white/60">EVENTOS</Text>
// 					</View>
// 				</View>

// 				{/* CARRUSEL GRANDE */}
// 				<View className="mt-4">
// 					<FlatList
// 						horizontal
// 						pagingEnabled
// 						showsHorizontalScrollIndicator={false}
// 						snapToAlignment="center"
// 						decelerationRate="fast"
// 						contentContainerStyle={{ paddingHorizontal: 12 }}
// 						data={featured.length ? featured : [null, null, null]}
// 						keyExtractor={(_, i) => `big-${i}`}
// 						renderItem={({ item }) => (
// 							<BigArtistCard
// 								width={BIG_CARD_W}
// 								height={BIG_CARD_H}
// 								artist={item ? (item as Artist) : undefined}
// 							/>
// 						)}
// 						onViewableItemsChanged={onViewableItemsChanged.current}
// 						viewabilityConfig={viewabilityConfig}
// 					/>

// 					{/* DOTS */}
// 					<View className="flex-row items-center justify-center gap-2 mt-2">
// 						{(featured.length ? featured : [0, 1, 2]).map((_, i) => (
// 							<View
// 								key={`dot-${i}`}
// 								className={`rounded-full ${i === activeSlide ? "bg-[#FF2D55]" : "bg-white/30"
// 									}`}
// 								style={{ width: 8, height: 8 }}
// 							/>
// 						))}
// 					</View>
// 				</View>

// 				{/* ARTISTAS DESTACADOS */}
// 				<View className="mt-5">
// 					<Text className="text-white font-extrabold text-lg px-4">
// 						Artistas destacados
// 					</Text>
// 					<ScrollView
// 						horizontal
// 						showsHorizontalScrollIndicator={false}
// 						contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
// 					>
// 						{artists.map((a) => (
// 							<Pressable
// 								key={a.id}
// 								onPress={() => router.push("/(tabs)/artist")}
// 								className="items-center mr-4"
// 							>
// 								<Image
// 									source={{
// 										uri:
// 											a.avatar_url ??
// 											"https://placehold.co/120x120/png?text=Artist",
// 									}}
// 									className="w-16 h-16 rounded-full bg-[#1f1f1f]"
// 								/>
// 								<Text
// 									numberOfLines={1}
// 									className="text-white mt-2 text-xs max-w-16 text-center"
// 								>
// 									{a.name}
// 								</Text>
// 							</Pressable>
// 						))}
// 						{!artists.length && (
// 							<Text className="text-white/60 px-2">Cargando…</Text>
// 						)}
// 					</ScrollView>
// 				</View>

// 				{/* MÁS ESCUCHADAS (DEMO LIST) */}
// 				<View className="mt-1 px-3">
// 					<Text className="text-white font-extrabold text-lg mb-3">
// 						Más escuchadas
// 					</Text>

// 					{TOP_SONGS.map((song, idx) => (
// 						<View
// 							key={song.id}
// 							className={`flex-row items-center rounded-xl px-3 py-3 mb-2 ${idx === 0 ? "bg-[#FF2D55]/15 border border-[#FF2D55]/40" : "bg-[#1A1A1A]"
// 								}`}
// 						>
// 							<Text className="text-white/60 w-6 text-center">{idx + 1}</Text>

// 							<Image
// 								source={{ uri: song.cover }}
// 								className="w-10 h-10 rounded-md bg-[#2a2a2a] mr-3"
// 							/>

// 							<View className="flex-1">
// 								<Text className="text-white font-semibold" numberOfLines={1}>
// 									{song.title}
// 								</Text>
// 								<Text className="text-white/60 text-xs" numberOfLines={1}>
// 									{song.artist}
// 								</Text>
// 							</View>

// 							<View className="flex-row items-center gap-2">
// 								<Ionicons name="logo-spotify" size={20} color="#1DB954" />
// 								<Text className="text-white/80 text-xs">{song.plays}</Text>
// 							</View>
// 						</View>
// 					))}
// 				</View>
// 			</ScrollView>
// 		</SafeAreaView>
// 	);
// }

// /* --- COMPONENTES --- */

// function BigArtistCard({
// 	artist,
// 	width,
// 	height,
// }: {
// 	artist?: Artist;
// 	width: number;
// 	height: number;
// }) {

// 	const img =
// 		artist?.cover_url ??
// 		"https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?q=80&w=1400&auto=format&fit=crop";

// 	return (
// 		<View
// 			className="rounded-2xl overflow-hidden mr-3 bg-[#121212]"
// 			style={{ width, height }}
// 		>
// 			<Image source={{ uri: img }} className="w-full h-full" />
// 			<LinearGradient
// 				colors={["rgba(255,45,85,0.0)", "rgba(255,45,85,0.25)", "rgba(0,0,0,0.8)"]}
// 				locations={[0, 0.42, 1]}
// 				className="absolute inset-0"
// 			/>

// 			<View className="absolute left-4 right-4 bottom-4">
// 				<Text className="text-white font-extrabold text-2xl">
// 					{artist?.name ?? "Kidd Voodoo"}
// 				</Text>
// 				<Text className="text-white/70">Trap/R&B</Text>
// 			</View>
// 		</View>
// 	);
// }

// /* --- DATA DEMO PARA “MÁS ESCUCHADAS” --- */
// const TOP_SONGS = [
// 	{
// 		id: "1",
// 		title: "Mambinho Brasileño",
// 		artist: "benjitalkapone",
// 		cover:
// 			"https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=400&auto=format&fit=crop",
// 		plays: "280K",
// 	},
// 	{
// 		id: "2",
// 		title: "QLOO*",
// 		artist: "Young Cister, Kreamly",
// 		cover:
// 			"https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop",
// 		plays: "259K",
// 	},
// 	{
// 		id: "3",
// 		title: "Who",
// 		artist: "Jimin",
// 		cover:
// 			"https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?q=80&w=400&auto=format&fit=crop",
// 		plays: "232K",
// 	},
// 	{
// 		id: "4",
// 		title: "y ke pa - Remix",
// 		artist: "Julianino Sosa, benjitalkapone, Jairo Vera",
// 		cover:
// 			"https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=400&auto=format&fit=crop",
// 		plays: "217K",
// 	},
// 	{
// 		id: "5",
// 		title: "La Plena - W Sound…",
// 		artist: "W Sound, Beéle, Ovy On The Drums",
// 		cover:
// 			"https://images.unsplash.com/photo-1509326068474-61ebd2f4c1d1?q=80&w=400&auto=format&fit=crop",
// 		plays: "213K",
// 	},
// 	{
// 		id: "6",
// 		title: "no tiene sentido",
// 		artist: "Beéle",
// 		cover:
// 			"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=400&auto=format&fit=crop",
// 		plays: "191K",
// 	},
// 	{
// 		id: "7",
// 		title: "Somos Diferentes…",
// 		artist: "Nickoog Clk, Jere Klein, Katteyes, Juanka",
// 		cover:
// 			"https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop",
// 		plays: "178K",
// 	},
// ];

