import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function slug(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export const parseIdToken = (
	idToken: string,
): {
	email: string;
	picture?: string;
	name: string;
} => {
	try {
		const base64Payload = idToken.split(".")[1];
		const decoded = atob(base64Payload);
		return JSON.parse(decoded);
	} catch {
		throw new Error("Invalid JWT token format");
	}
};

export const formatRupiah = (value: number): string => {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
	}).format(value);
};
