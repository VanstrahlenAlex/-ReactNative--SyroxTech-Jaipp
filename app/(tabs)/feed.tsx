import React, { useCallback, useEffect, useState } from "react";
import {
	View,
	Text,
	FlatList,
	ActivityIndicator,
	StyleSheet,
	Image,
	TouchableOpacity,
	Dimensions,
	RefreshControl,
	Alert,
	Modal,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	Share,
	NativeSyntheticEvent,
	NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { VideoView, useVideoPlayer } from "expo-video";
import { supabase } from "@/utils/supabase";


type VideoRow = {
	id: string;
	title?: string | null;
	uri: string;
	user_id: string;
	created_at: string;
	signedUrl?: string | null;
};

type UserRow = {
	id: string;
	username?: string | null;
	email?: string | null;
};

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

export default function Feed() {
	const [videos, setVideos] = useState<VideoRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	const [myUserId, setMyUserId] = useState<string | null>(null);
	const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
	const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
	const [authors, setAuthors] = useState<Record<string, UserRow>>({});

	// visibilidad
	const [activeIndex, setActiveIndex] = useState(0);

	// Comentarios
	const [commentForVideo, setCommentForVideo] = useState<VideoRow | null>(null);
	const [commentText, setCommentText] = useState("");
	const [comments, setComments] = useState<
		{ id: string; text: string; user_id: string; created_at: string }[]
	>([]);

	useEffect(() => {
		(async () => {
			const { data } = await supabase.auth.getUser();
			setMyUserId(data.user?.id ?? null);
			await loadFeed();
		})();
	}, []);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadFeed();
		setRefreshing(false);
	}, []);

	const handleScrollEnd = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			const y = e.nativeEvent.contentOffset.y;
			const idx = Math.max(0, Math.round(y / SCREEN_H));
			setActiveIndex(idx);
		},
		[]
	);

	const loadFeed = async () => {
		try {
			setError(null);

			const { data: rows, error } = await supabase
				.from("Video")
				.select("id,title,uri,user_id,created_at")
				.order("created_at", { ascending: false });
			if (error) throw error;

			const list: VideoRow[] = rows ?? [];

			const { data: signed, error: signErr } = await supabase
				.storage
				.from("videos") 
				.createSignedUrls(list.map((v) => v.uri), 60 * 60 * 24 * 7);
			if (signErr) throw signErr;

			const withUrls = list.map((v, i) => ({
				...v,
				signedUrl: signed?.[i]?.signedUrl ?? null,
			}));
			setVideos(withUrls);

			const userIds = Array.from(new Set(withUrls.map((v) => v.user_id)));
			if (userIds.length) {
				const { data: users } = await supabase
					.from("User")
					.select("id,username,email")
					.in("id", userIds);
				const map: Record<string, UserRow> = {};
				(users ?? []).forEach((u) => (map[u.id] = u));
				setAuthors(map);
			} else {
				setAuthors({});
			}

			await hydrateLikes(withUrls);
			setActiveIndex(0); 
		} catch (e: any) {
			setError(e.message ?? "Error cargando feed");
		} finally {
			setLoading(false);
		}
	};

	const hydrateLikes = async (list: VideoRow[]) => {
		if (!list.length) {
			setLikedByMe({});
			setLikeCounts({});
			return;
		}
		const ids = list.map((v) => v.id);
		const { data, error } = await supabase
			.from("Like")
			.select("id,video_id,user_id")
			.in("video_id", ids);
		if (error) {
			console.log("hydrateLikes error", error);
			return;
		}
		const counts: Record<string, number> = {};
		const mine: Record<string, boolean> = {};
		for (const r of data ?? []) {
			counts[r.video_id] = (counts[r.video_id] ?? 0) + 1;
			if (r.user_id === myUserId) mine[r.video_id] = true;
		}
		setLikeCounts(counts);
		setLikedByMe(mine);
	};

	const handleLike = async (video: VideoRow) => {
		try {
			const { data } = await supabase.auth.getUser();
			const user = data.user;
			if (!user) {
				Alert.alert("Sesión", "Inicia sesión para dar like.");
				return;
			}

			const { data: existing } = await supabase
				.from("Like")
				.select("id")
				.eq("user_id", user.id)
				.eq("video_id", video.id)
				.maybeSingle();

			if (existing) {
				await supabase.from("Like").delete().eq("id", existing.id);
				setLikedByMe((prev) => ({ ...prev, [video.id]: false }));
				setLikeCounts((prev) => ({
					...prev,
					[video.id]: Math.max(0, (prev[video.id] ?? 1) - 1),
				}));
			} else {
				await supabase.from("Like").insert({
					id: `${user.id}_${Date.now()}`,
					user_id: user.id,
					video_id: video.id,
					video_user_id: video.user_id,
				});
				setLikedByMe((prev) => ({ ...prev, [video.id]: true }));
				setLikeCounts((prev) => ({
					...prev,
					[video.id]: (prev[video.id] ?? 0) + 1,
				}));
			}
		} catch (e) {
			console.log("Error in handleLike:", e);
			Alert.alert("Error", "No se pudo dar like.");
		}
	};

	const handleShare = async (video: VideoRow) => {
		try {
			if (!video.signedUrl) throw new Error("URL no disponible");
			await Share.share({
				title: "Mira este video",
				message: video.signedUrl,
				url: video.signedUrl,
			});
		} catch (e) {
			Alert.alert("Error", "No se pudo compartir.");
		}
	};

	const openComments = async (video: VideoRow) => {
		setCommentForVideo(video);
		setCommentText("");
		const { data, error } = await supabase
			.from("Comment")
			.select("id,text,user_id,created_at")
			.eq("video_id", video.id)
			.order("created_at", { ascending: true });
		if (error) {
			console.log("comments error", error);
			setComments([]);
		} else {
			setComments(data ?? []);
		}
	};

	const sendComment = async () => {
		try {
			const v = commentForVideo!;
			if (!commentText.trim()) return;

			const { data } = await supabase.auth.getUser();
			const user = data.user;
			if (!user) {
				Alert.alert("Sesión", "Inicia sesión para comentar.");
				return;
			}
			const newRow = {
				id: `${user.id}_${Date.now()}`,
				user_id: user.id,
				video_id: v.id,
				video_user_id: v.user_id,
				text: commentText.trim(),
			};
			const { error } = await supabase.from("Comment").insert(newRow);
			if (error) throw error;

			setComments((prev) => [
				...prev,
				{
					id: newRow.id,
					text: newRow.text,
					user_id: newRow.user_id,
					created_at: new Date().toISOString(),
				},
			]);
			setCommentText("");
		} catch (e) {
			console.log("comment error", e);
			Alert.alert("Error", "No se pudo comentar.");
		}
	};

	if (loading) {
		return (
			<View style={styles.loading}>
				<ActivityIndicator size="large" color="#fff" />
			</View>
		);
	}
	if (error) {
		return (
			<View style={styles.loading}>
				<Text style={{ color: "#fff" }}>Error: {error}</Text>
			</View>
		);
	}

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
			<FlatList
				data={videos}
				keyExtractor={(it) => it.id}
				renderItem={({ item, index }) => (
					<Post
						item={item}
						isActive={index === activeIndex} // 👈 sólo este reproduce
						liked={!!likedByMe[item.id]}
						likes={likeCounts[item.id] ?? 0}
						author={authors[item.user_id]}
						onLike={() => handleLike(item)}
						onShare={() => handleShare(item)}
						onComment={() => openComments(item)}
					/>
				)}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				pagingEnabled
				snapToInterval={SCREEN_H}
				decelerationRate="fast"
				onMomentumScrollEnd={handleScrollEnd}
				onScrollEndDrag={handleScrollEnd}
				initialNumToRender={2}
				windowSize={3}
				removeClippedSubviews
				style={{ backgroundColor: "black" }}
			/>

			{/* Modal de comentarios */}
			<Modal
				visible={!!commentForVideo}
				transparent
				animationType="slide"
				onRequestClose={() => setCommentForVideo(null)}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					style={styles.modalWrap}
				>
					<View style={styles.modalCard}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Comentarios</Text>
							<TouchableOpacity onPress={() => setCommentForVideo(null)}>
								<Ionicons name="close" size={24} color="#fff" />
							</TouchableOpacity>
						</View>

						<FlatList
							style={{ maxHeight: SCREEN_H * 0.4 }}
							data={comments}
							keyExtractor={(it) => it.id}
							renderItem={({ item }) => (
								<View style={styles.commentItem}>
									<View style={styles.commentAvatar} />
									<View style={{ flex: 1 }}>
										<Text style={styles.commentUser}>
											{item.user_id === myUserId ? "Tú" : item.user_id.slice(0, 6)}
										</Text>
										<Text style={styles.commentText}>{item.text}</Text>
									</View>
								</View>
							)}
							ListEmptyComponent={
								<Text style={{ color: "#bbb" }}>Sé el primero en comentar</Text>
							}
						/>

						<View style={styles.composer}>
							<TextInput
								placeholder="Escribe un comentario..."
								placeholderTextColor="#999"
								style={styles.input}
								value={commentText}
								onChangeText={setCommentText}
							/>
							<TouchableOpacity onPress={sendComment} style={styles.sendBtn}>
								<Ionicons name="send" size={18} color="#000" />
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</SafeAreaView>
	);
}

function Post({
	item,
	author,
	liked,
	likes,
	onLike,
	onComment,
	onShare,
	isActive,
}: {
	item: VideoRow;
	author?: UserRow;
	liked: boolean;
	likes: number;
	onLike: () => void;
	onComment: () => void;
	onShare: () => void;
	isActive: boolean;
}) {

	const player = useVideoPlayer({ uri: item.signedUrl ?? "" });

	useEffect(() => {
		player.loop = true;
		if (item.signedUrl && isActive) {
			player.play();
		} else {
			player.pause();
		}
	}, [isActive, item.signedUrl, player]);

	return (
		<View style={styles.post}>
			{item.signedUrl ? (
				<VideoView style={styles.video} player={player} resizeMode="cover" />
			) : (
				<View style={styles.videoFallback}>
					<Text style={{ color: "#fff" }}>Video no disponible</Text>
				</View>
			)}

			{/* Header: perfil del autor */}
			<View style={styles.header}>
				<View style={styles.avatar} />
				<View style={{ marginLeft: 8 }}>
					<Text style={styles.username}>@{author?.username ?? "usuario"}</Text>
					<Text style={styles.date}>
						{new Date(item.created_at).toLocaleDateString()}
					</Text>
				</View>
			</View>

			{/* Acciones verticales (derecha) */}
			<View style={styles.actions}>
				<TouchableOpacity onPress={onLike} style={styles.actionBtn} hitSlop={8}>
					<Ionicons
						name={liked ? "heart" : "heart-outline"}
						size={28}
						color={liked ? "#FB0086" : "#fff"}
					/>
					<Text style={styles.actionTxt}>{likes}</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={onComment}
					style={styles.actionBtn}
					hitSlop={8}
				>
					<Ionicons name="chatbubble-outline" size={26} color="#fff" />
					<Text style={styles.actionTxt}>Comentar</Text>
				</TouchableOpacity>

				<TouchableOpacity onPress={onShare} style={styles.actionBtn} hitSlop={8}>
					<Ionicons name="share-social-outline" size={26} color="#fff" />
					<Text style={styles.actionTxt}>Compartir</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "black" },

	post: { height: SCREEN_H, width: SCREEN_W, backgroundColor: "black" },

	video: { position: "absolute", inset: 0 },
	videoFallback: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" },

	header: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 12,
		paddingTop: 10,
		paddingBottom: 8,
		backgroundColor: "rgba(0,0,0,0.35)",
		flexDirection: "row",
		alignItems: "center",
	},
	avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#333",  },
	username: { color: "#fff", fontWeight: "700" },
	date: { color: "#bbb", fontSize: 12 },

	actions: {
		position: "absolute",
		right: 10,
		bottom: 134, 
		alignItems: "center",
		gap: 16,
	},
	actionBtn: { alignItems: "center" },
	actionTxt: { color: "#fff", fontSize: 12, marginTop: 2 },

	// Modal comentarios
	modalWrap: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
		justifyContent: "flex-end",
	},
	modalCard: {
		backgroundColor: "#111",
		padding: 16,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
		justifyContent: "space-between",
	},
	modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },

	commentItem: {
		flexDirection: "row",
		gap: 10,
		alignItems: "flex-start",
		paddingVertical: 8,
	},
	commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#333" },
	commentUser: { color: "#fff", fontWeight: "600" },
	commentText: { color: "#ddd" },

	composer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginTop: 8,
	},
	input: {
		flex: 1,
		backgroundColor: "#1b1b1b",
		borderRadius: 20,
		paddingHorizontal: 14,
		paddingVertical: Platform.OS === "ios" ? 12 : 8,
		color: "#fff",
	},
	sendBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FB0086",
	},
});

