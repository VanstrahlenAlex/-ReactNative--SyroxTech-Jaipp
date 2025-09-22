import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	Image,
	TouchableOpacity,
	TextInput,
	Dimensions,
	Alert,
	Modal,
	Share,
	Platform,
	ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/utils/supabase";
import { Artist } from "@/types/artist";



const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 32 - 24) / 3; 

export default function ArtistScreen() {
	const insets = useSafeAreaInsets();

	const [term, setTerm] = useState("");
	const [loading, setLoading] = useState(true);
	const [artists, setArtists] = useState<Artist[]>([]);
	const [following, setFollowing] = useState<Set<string>>(new Set());
	const [me, setMe] = useState<string | null>(null);

	
	const [openArtist, setOpenArtist] = useState<Artist | null>(null);
	const [followersCount, setFollowersCount] = useState<number | null>(null);

	
	useEffect(() => {
		(async () => {
			const { data } = await supabase.auth.getUser();
			setMe(data.user?.id ?? null);
			await loadArtists();
			if (data.user?.id) await hydrateFollowing(data.user.id);
		})().finally(() => setLoading(false));
	}, []);

	const loadArtists = async (query?: string) => {
		const base = supabase
			.from("Artist")
			.select("*")
			.order("created_at", { ascending: false });

		const req =
			query && query.trim().length > 0
				? base.ilike("name", `%${query.trim()}%`)
				: base;

		const { data, error } = await req;
		if (error) {
			console.log("artist load error", error);
			return;
		}
		setArtists((data ?? []) as Artist[]);
	};

	const hydrateFollowing = async (userId: string) => {
		
		const { data, error } = await supabase
			.from("Follower")
			.select("user_id")
			.eq("follower_user_id", userId);
		if (error) {
			console.log("following error", error);
			return;
		}
		const set = new Set<string>((data ?? []).map((r: any) => r.user_id));
		setFollowing(set);
	};

	
	useEffect(() => {
		const t = setTimeout(() => loadArtists(term), 250);
		return () => clearTimeout(t);
	}, [term]);

	const toggleFollow = useCallback(
		async (artist: Artist) => {
			if (!me) {
				Alert.alert("Sesión", "Inicia sesión para seguir artistas.");
				return;
			}

			try {
				const isFollowing = following.has(artist.id);

				if (isFollowing) {
					const { error } = await supabase
						.from("Follower")
						.delete()
						.eq("user_id", artist.id)
						.eq("follower_user_id", me);

					if (error) throw error;

					const next = new Set(following);
					next.delete(artist.id);
					setFollowing(next);

					if (openArtist?.id === artist.id) await refreshFollowersCount(artist.id);
				} else {
					const payload = {
						id: `${me}_${artist.id}`,       
						user_id: artist.id,             
						follower_user_id: me,           
						created_at: new Date().toISOString(), 
					};

					
					const { error } = await supabase
						.from("Follower")
						.insert(payload)
						.select("user_id")
						.single();

					if (error) throw error;

					const next = new Set(following);
					next.add(artist.id);
					setFollowing(next);

					if (openArtist?.id === artist.id) await refreshFollowersCount(artist.id);
				}
			} catch (e: any) {
				console.log("toggleFollow error:", e);
				Alert.alert("Error", e?.message || "No se pudo actualizar el seguimiento.");
			}
		},
		[me, following, openArtist]
	);


	const openArtistModal = async (artist: Artist) => {
		setOpenArtist(artist);
		const { count } = await supabase
			.from("Follower")
			.select("id", { count: "exact", head: true })
			.eq("user_id", artist.id);
		setFollowersCount(count ?? 0);
	};

	const shareArtist = async (artist: Artist) => {
		try {
			const msg = `Sigue a ${artist.name} en JAIPP 🔥`;
			await Share.share({ title: artist.name, message: msg });
		} catch {
			Alert.alert("Error", "No se pudo compartir.");
		}
	};

	const dataToRender = useMemo(() => artists, [artists]);

	const refreshFollowersCount = async (artistId: string) => {
		const { count, error } = await supabase
			.from("Follower")
			.select("id", { count: "exact", head: true })
			.eq("user_id", artistId);
		if (!error) setFollowersCount(count ?? 0);
	};


	return (
		<SafeAreaView style={[styles.screen, { paddingTop: insets.top + 4 }]}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.brand}>Jaipp</Text>
				<TouchableOpacity
					style={styles.createBtn}
					onPress={() => Alert.alert("Cuenta", "Función en demo")}
				>
					<Ionicons name="person-add-outline" size={16} color="#FF2D55" />
					<Text style={styles.createText}>Crear cuenta</Text>
				</TouchableOpacity>
			</View>

			{/* Search */}
			<View style={styles.searchWrap}>
				<Ionicons name="search" size={18} color="#FF2D55" style={{ marginLeft: 12 }} />
				<TextInput
					value={term}
					onChangeText={setTerm}
					placeholder="Descubre y suscríbete a tus artistas favoritos"
					placeholderTextColor="#666"
					style={styles.searchInput}
					returnKeyType="search"
				/>
			</View>

			{/* Grid */}
			<FlatList
				data={dataToRender}
				keyExtractor={(it) => it.id}
				numColumns={3}
				columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
				contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
				renderItem={({ item }) => (
					<ArtistCard
						artist={item}
						isFollowing={following.has(item.id)}
						onPress={() => openArtistModal(item)}
						onToggle={() => toggleFollow(item)}
					/>
				)}
				ListEmptyComponent={
					<View style={{ paddingTop: 40, alignItems: "center" }}>
						<Text style={{ color: "#bbb" }}>No se encontraron artistas</Text>
					</View>
				}
				style={{ marginTop: 8 }}
			/>

			{/* Modal Detalle */}
			<Modal
				animationType="slide"
				transparent
				visible={!!openArtist}
				onRequestClose={() => setOpenArtist(null)}
			>
				<View style={styles.modalBackdrop}>
					{openArtist ? (
						<View style={styles.modalCard}>
							{openArtist.cover_url ? (
								<Image source={{ uri: openArtist.cover_url }} style={styles.cover} />
							) : (
								<View style={[styles.cover, { backgroundColor: "#222" }]} />
							)}

							{/* Top actions sobre la portada */}
							<View style={styles.topActions}>
								<TouchableOpacity
									onPress={() => setOpenArtist(null)}
									style={styles.topBtn}
								>
									<Ionicons name="chevron-back" size={22} color="#fff" />
								</TouchableOpacity>

								<View style={{ flexDirection: "row", gap: 12 }}>
									<TouchableOpacity
										onPress={() => shareArtist(openArtist)}
										style={styles.topBtn}
									>
										<Ionicons name="share-social-outline" size={20} color="#fff" />
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => toggleFollow(openArtist)}
										style={styles.topBtn}
									>
										<Ionicons
											name={
												following.has(openArtist.id) ? "heart" : "heart-outline"
											}
											size={20}
											color="#fff"
										/>
									</TouchableOpacity>
								</View>
							</View>

							<ScrollView contentContainerStyle={{ padding: 16 }}>
								{/* Avatar + nombre */}
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
										gap: 12,
										marginTop: -5,
									}}
								>
									<Image
										source={{
											uri:
												openArtist.avatar_url ||
												"https://placehold.co/120x120/png",
										}}
										style={styles.bigAvatar}
									/>
									<View style={{ flex: 1 }}>
										<Text style={styles.artistName}>{openArtist.name}</Text>
										<Text style={styles.artistMeta}>
											{followersCount ?? 0} seguidores
											{openArtist.verified ? "  •  Verificado" : ""}
										</Text>
									</View>
								</View>

								{/* CTA principal */}
								<TouchableOpacity
									onPress={() => Alert.alert("Pre-inscribirse", "Función en demo")}
									style={styles.primaryCta}
								>
									<Text style={styles.primaryCtaText}>Pre-Inscribirse</Text>
								</TouchableOpacity>

								{/* Bio */}
								{!!openArtist.bio && (
									<Text style={styles.bio}>{openArtist.bio}</Text>
								)}

								{/* Social chips */}
								<View style={styles.chips}>
									{openArtist.instagram ? <Chip label="@instagram" /> : null}
									{openArtist.youtube ? <Chip label="YouTube" /> : null}
									{openArtist.x_twitter ? <Chip label="X" /> : null}
									{openArtist.spotify ? <Chip label="Spotify" /> : null}
									{openArtist.apple_music ? <Chip label="Apple Music" /> : null}
									{openArtist.tiktok ? <Chip label="TikTok" /> : null}
								</View>

								{/* Card “Hazte miembro” */}
								<LinearGradient
									colors={["#6C2BD9", "#FB0086"]}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
									style={styles.memberCard}
								>
									<Text style={styles.memberTitle}>Hazte miembro</Text>
									<Text style={styles.memberBullet}>
										• Accede a contenido exclusivo
									</Text>
									<Text style={styles.memberBullet}>• Chats privados</Text>

									<View style={styles.planRow}>
										<View style={styles.planBox}>
											<Text style={styles.planName}>Plan Super Fan</Text>
											<Text style={styles.planDesc}>
												Acceso a contenido exclusivo
											</Text>
										</View>
										<Text style={styles.planPrice}>$5.99/mes</Text>
									</View>

									<TouchableOpacity
										onPress={() => Alert.alert("Suscribirme", "Función en demo")}
										style={styles.memberCTA}
									>
										<Text style={styles.memberCTAText}>Suscribirme</Text>
									</TouchableOpacity>
								</LinearGradient>

								{/* Seguir / Dejar de seguir */}
								<TouchableOpacity
									onPress={() => toggleFollow(openArtist)}
									style={[
										styles.followBtn,
										following.has(openArtist.id) && {
											backgroundColor: "#2a2a2a",
											borderColor: "#555",
										},
									]}
								>
									<Text style={styles.followText}>
										{following.has(openArtist.id)
											? "Dejar de seguir"
											: "Seguir"}
									</Text>
								</TouchableOpacity>
							</ScrollView>
						</View>
					) : null}
				</View>
			</Modal>
		</SafeAreaView>
	);
}

function ArtistCard({
	artist,
	isFollowing,
	onPress,
	onToggle,
}: {
	artist: Artist;
	isFollowing: boolean;
	onPress: () => void;
	onToggle: () => void;
}) {
	return (
		<View style={styles.card}>
			<TouchableOpacity activeOpacity={0.8} onPress={onPress}>
				<Image
					source={{
						uri: artist.avatar_url || "https://placehold.co/200x200/png",
					}}
					style={styles.avatar}
				/>
				{(artist.verified || isFollowing) && (
					<View style={styles.badge}>
						<Ionicons name="checkmark" size={14} color="#fff" />
					</View>
				)}
			</TouchableOpacity>

			<Text style={styles.name} numberOfLines={1}>
				{artist.name}
			</Text>

			<TouchableOpacity style={styles.followMini} onPress={onToggle}>
				<Ionicons
					name={isFollowing ? "heart" : "heart-outline"}
					size={16}
					color={isFollowing ? "#FB0086" : "#999"}
				/>
				<Text
					style={[
						styles.followMiniText,
						isFollowing && { color: "#FB0086" },
					]}
				>
					{isFollowing ? "Siguiendo" : "Seguir"}
				</Text>
			</TouchableOpacity>
		</View>
	);
}

function Chip({ label }: { label: string }) {
	return (
		<View style={styles.chip}>
			<Text style={styles.chipText}>{label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#0F0F0F" },

	header: {
		paddingHorizontal: 16,
		paddingBottom: 8,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	brand: { color: "#fff", fontSize: 20, fontWeight: "800" },
	createBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	createText: { color: "#FF2D55", fontWeight: "700" },

	searchWrap: {
		marginHorizontal: 16,
		marginTop: 6,
		backgroundColor: "#fff",
		borderRadius: 16,
		borderWidth: 2,
		borderColor: "#FF2D55",
		flexDirection: "row",
		alignItems: "center",
		paddingRight: 12,
		height: 44,
		overflow: "hidden",
	},
	searchInput: {
		flex: 1,
		paddingHorizontal: 10,
		color: "#1a1a1a",
		fontSize: 14,
	},

	card: {
		width: CARD_W,
		alignItems: "center",
	},
	avatar: {
		width: CARD_W,
		height: CARD_W,
		borderRadius: CARD_W / 2,
		backgroundColor: "#222",
	},
	badge: {
		position: "absolute",
		right: -2,
		top: -2,
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: "#FF2D55",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		borderColor: "#0F0F0F",
	},
	name: { color: "#fff", marginTop: 6, fontSize: 12, fontWeight: "600" },

	followMini: {
		marginTop: 4,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	followMiniText: { color: "#999", fontSize: 12, fontWeight: "600" },

	// Modal
	modalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	modalCard: {
		flex: 1,
		backgroundColor: "#0F0F0F",
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		overflow: "hidden",
	},
	cover: { width: "100%", height: 220 },
	topActions: {
		position: "absolute",
		top: Platform.OS === "ios" ? 44 : 24,
		left: 12,
		right: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	topBtn: {
		backgroundColor: "rgba(0,0,0,0.35)",
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	bigAvatar: {
		width: 72,
		height: 72,
		borderRadius: 36,
		borderWidth: 2,
		borderColor: "#111",
		backgroundColor: "#222",
	},
	artistName: { color: "#fff", fontSize: 20, fontWeight: "800" },
	artistMeta: { color: "#bbb", marginTop: 2 },

	primaryCta: {
		marginTop: 12,
		height: 44,
		borderRadius: 24,
		backgroundColor: "#FF2D55",
		alignItems: "center",
		justifyContent: "center",
	},
	primaryCtaText: { color: "#fff", fontWeight: "800" },

	bio: { color: "#ddd", marginTop: 12 },
	chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
	chip: {
		backgroundColor: "#1C1C1E",
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 16,
	},
	chipText: { color: "#fff", fontWeight: "700", fontSize: 12 },

	memberCard: {
		marginTop: 16,
		borderRadius: 16,
		padding: 16,
	},
	memberTitle: { color: "#fff", fontWeight: "800", marginBottom: 6 },
	memberBullet: { color: "#fff" },

	planRow: {
		marginTop: 12,
		backgroundColor: "rgba(255,255,255,0.15)",
		borderRadius: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 12,
	},
	planBox: { flex: 1, paddingRight: 8 },
	planName: { color: "#fff", fontWeight: "800" },
	planDesc: { color: "#fff" },
	planPrice: { color: "#fff", fontWeight: "800" },

	memberCTA: {
		marginTop: 12,
		height: 44,
		borderRadius: 24,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
	},
	memberCTAText: { color: "#000", fontWeight: "800" },

	followBtn: {
		marginTop: 16,
		height: 44,
		borderRadius: 24,
		borderWidth: 1,
		borderColor: "#FF2D55",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FF2D55",
	},
	followText: { color: "#fff", fontWeight: "800" },
});
