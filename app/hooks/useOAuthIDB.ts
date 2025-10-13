import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { parseIdToken, slug } from "@/lib/utils";
import { id } from "@instantdb/react";

interface JWTPayload {
	email: string;
	picture?: string;
	name: string;
}

export const useOAuthIDB = () => {
	const [nonce, setNonce] = useState<string>("");
	const [isAuthenticating, setIsAuthenticating] = useState(false);

	useEffect(() => {
		setNonce(crypto.randomUUID());
	}, []);

	// Ambil status autentikasi dari DB
	const { user: userLoggedIn, isLoading: isAuthLoading, error } = db.useAuth();

	const queryGetProfile = {
		user_profiles: { $: { where: { $users: userLoggedIn?.id }, limit: 1 } },
	};

	const userProfiles = db.useQuery(queryGetProfile);

	const user = useMemo(() => {
		if (!userLoggedIn) return null;
		return {
			...userLoggedIn,
			...userProfiles.data?.user_profiles?.[0],
		};
	}, [userLoggedIn, userProfiles]);

	// Fungsi untuk tambah profil baru jika belum ada
	const addUserProfile = async (newUser: JWTPayload, userId: string) => {
		if (!userId) return;

		try {
			const { data } = await db.queryOnce({
				user_profiles: { $: { where: { $users: userId }, limit: 1 } },
			});

			if (data.user_profiles?.length) return;

			await db.transact([
				db.tx.user_profiles[id()]
					.create({
						name: newUser.name,
						avatar_url: newUser.picture,
						created_at: new Date(),
					})
					.link({ $users: userId }),
			]);
		} catch (error) {
			console.error("Failed to add new user profile:", error);
			throw new Error("Profile creation failed");
		}
	};

	// Login dengan Google ID Token
	const handleGoogleSuccess = useCallback(
		async (credentialResponse: any): Promise<void> => {
			setIsAuthenticating(true);
			let subdomain = "";
			try {
				const credential = credentialResponse?.credential;
				if (!credential) throw new Error("No credential received from Google");

				const parsedToken = parseIdToken(credential);
				const newTenantName = parsedToken.name;
				subdomain = slug(newTenantName);

				const { user } = await db.auth.signInWithIdToken({
					clientName: "google-web",
					idToken: credential,
					nonce,
				});

				await addUserProfile(parsedToken, user.id);

				toast.success("Login berhasil");
				// ✅ Ganti router.push dengan navigasi bawaan browser
				window.location.href = "/dashboard";
			} catch (error: any) {
				const errorMessage =
					error.body?.message || error.message || "Login failed";
				toast.error(`Login gagal: ${errorMessage}`);
			} finally {
				setIsAuthenticating(false);
			}
		},
		[nonce],
	);

	const handleGoogleError = useCallback((): void => {
		toast.error("Login Google gagal. Silakan coba lagi.");
	}, []);

	const logout = useCallback(() => {
		try {
			db.auth.signOut();
			// ✅ Ganti router.push dengan navigasi biasa
			window.location.href = "/sign-up";
		} catch (error) {
			console.error("Logout failed:", error);
			toast.error("Logout gagal. Silakan coba lagi.");
		}
	}, []);

	return {
		user,
		isLoading: isAuthLoading || isAuthenticating,
		error,
		nonce,
		logout,
		handleGoogleSuccess,
		handleGoogleError,
	};
};
