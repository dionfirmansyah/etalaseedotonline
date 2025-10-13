"use client";

import { Shield } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { useOAuthIDB } from "@/hooks/useOAuthIDB";

import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "@/components/ui/sheet";
import { SiGoogle } from "react-icons/si";

interface LoginAsGuestSheetProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function LoginAsGuestSheet({
	isOpen,
	onOpenChange,
}: LoginAsGuestSheetProps) {
	const { isLoading } = useOAuthIDB();

	const handleGuestLogin = async () => {
		try {
			await db.auth.signInAsGuest();
			toast.success("Berhasil masuk sebagai tamu");
		} catch (err) {
			console.error(err);
			toast.error("Gagal masuk sebagai tamu");
		}
	};

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="rounded-t-2xl border-t bg-white px-6 pb-10 pt-6 shadow-lg sm:max-w-md sm:mx-auto"
			>
				<SheetHeader className="text-center">
					<div className="mx-auto mb-4 flex w-full items-center justify-center gap-2">
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

					<SheetTitle className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
						Selamat Datang
					</SheetTitle>

					<SheetDescription className="text-sm text-gray-600 mt-2">
						Masuk dengan akun Google Anda untuk mendapatkan akses penuh ke semua
						fitur.
					</SheetDescription>
				</SheetHeader>

				<div className="mt-6 space-y-6">
					<div className="flex items-center justify-center space-x-2 rounded-lg border border-green-700 bg-green-700/10 px-4 py-2 text-sm">
						<Shield className="h-4 w-4 text-green-600" />
						<span className="text-center font-medium text-green-700">
							Login aman dengan enkripsi end-to-end
						</span>
					</div>

					<div className="flex justify-center">
						<Button type="button" disabled={isLoading}>
							<a
								href="/sign-up"
								className="flex items-center gap-2 text-accent"
							>
								<SiGoogle />
								<p>Masuk dengan google</p>
							</a>
						</Button>
					</div>
					<div className="flex justify-center">
						<Button
							onClick={handleGuestLogin}
							type="button"
							disabled={isLoading}
						>
							<p className="text-accent">Sign in as Guest</p>
						</Button>
					</div>

					{/* Spinner ketika loading */}
					{isLoading && (
						<div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
							<span>Memproses login, mohon tunggu...</span>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
