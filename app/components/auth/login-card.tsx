"use client";

import { useOAuthIDB } from "@/hooks/useOAuthIDB";
import { GoogleLogin } from "@react-oauth/google";
import { Shield } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Spinner } from "../ui/spinner";

export default function LoginCard() {
	const navigate = useNavigate();
	const { nonce, user, isLoading, handleGoogleSuccess, handleGoogleError } =
		useOAuthIDB();

	useEffect(() => {
		if (!isLoading && user) {
			navigate("/dashboard");
		}
	}, [user, isLoading, navigate]);

	if (isLoading) {
		return <Spinner className="size-6 text-primary" />;
	}

	return (
		<div className="container mx-auto flex h-screen items-center justify-center p-4">
			{/* Content */}
			<div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow">
				{/* Header */}
				<div className="mb-8 text-center">
					<div className="mx-auto mb-6 flex w-full items-center justify-center gap-2">
						<div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-gray-100">
							Logo
						</div>

						<div className="flex grid text-left text-sm leading-tight">
							<span className="truncate font-medium">Etalasee</span>
							<span className="truncate text-xs text-gray-500">
								Top PWA Starter
							</span>
						</div>
					</div>
					<h2 className="mb-2 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-2xl font-bold text-transparent">
						Selamat Datang
					</h2>
					<p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-600">
						Masuk dengan akun Google Anda untuk mendapatkan akses penuh ke semua
						fitur
					</p>
				</div>

				{/* Login Section */}
				<div className="space-y-6">
					<div className="flex items-center justify-center space-x-2 rounded-lg border border-green-700 bg-green-700/10 px-4 py-2 text-sm">
						<Shield className="h-4 w-4 text-green-600" />
						<span className="text-center font-medium text-green-700">
							Login aman dengan enkripsi end-to-end
						</span>
					</div>

					<div className="flex justify-center">
						<div
							className={`transition-opacity duration-200 ${
								isLoading ? "pointer-events-none opacity-50" : ""
							}`}
						>
							<GoogleLogin
								nonce={nonce}
								onSuccess={handleGoogleSuccess}
								onError={handleGoogleError}
								useOneTap={false}
								containerProps={{ className: "rounded-full" }}
								size="large"
								width={280}
								logo_alignment="left"
								theme="outline"
							/>
						</div>
					</div>

					{/* Spinner ketika loading */}
					{isLoading && (
						<div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
							<span>Memproses login, mohon tunggu...</span>
						</div>
					)}

					{/* Privacy */}
					<div className="mt-6 rounded-lg p-4 text-center">
						<p className="text-xs leading-relaxed text-gray-500">
							Dengan masuk, Anda menyetujui{" "}
							<button className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800">
								Kebijakan Privasi
							</button>{" "}
							dan{" "}
							<button className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800">
								Syarat Layanan
							</button>{" "}
							kami.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
