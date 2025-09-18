// types/auth.ts
export interface User {
	id: string;
	username: string;
	email: string;
	phoneNumber?: string;
	country?: string;
	countryCode?: string;
}

export interface AuthContextType {
	user: User | null;
	login: (credentials: any) => Promise<void>;
	logout: () => void;
	signUp: (username: string, email: string, password: string) => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
}