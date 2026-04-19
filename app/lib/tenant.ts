import { cache } from "react";
import { adminDB } from "./db";
import { slug } from "./utils";

export const rootDomain = import.meta.env.VITE_BASE_DOMAIN;

export async function isValidSlug(
	slug: string | undefined,
): Promise<{ valid: boolean }> {
	if (!slug) return { valid: false };

	try {
		const tenants = await getAllSubdomainData();

		const subdomains = tenants.map((t) => t.subdomain as string);
		return { valid: subdomains.includes(slug) };
	} catch (err) {
		console.error("InstantDB error:", err);
		return {
			valid: false,
			// isSubscribed: false
		};
	}
}

export async function getAllSubdomainData() {
	const data = await adminDB.query({
		tenants: { $: { fields: ["subdomain"] } },
	});

	return data?.tenants;
}

export async function getAllData(subdomain: string) {
	const sanitizedSubdomain = slug(subdomain);
	const data = await adminDB.query({
		tenants: {
			$: {
				fields: ["name", "subdomain", "description", "createdAt", "is_active"],
				where: { subdomain: sanitizedSubdomain },
			},
			owner: {
				user_profiles: { $: { fields: ["name", "avatar_url", "bio"] } },
			},
			products: {
				$: {
					fields: [
						"name",
						"descriptions",
						"slug",
						"price",
						"stock",
						"isActive",
						"created_at",
					],
				},
				product_images: {},
				category: { $: { fields: ["name", "slug"] } },
			},
			categories: {},
			info: {
				$: {
					fields: [
						"google_map",
						"instagram",
						"location",
						"tiktok",
						"whatsapp",
						"theme",
						"favicon",
						"logo",
					],
				},
			},
		},
	});
	return data.tenants[0];
}

export async function getSubdomain(request: Request) {
	const url = new URL(request.url);
	const hostname = url.hostname;
	const subdomain = hostname.split(".")[0];

	if (
		subdomain === "www" ||
		hostname === rootDomain ||
		hostname === `www.${rootDomain}`
	) {
		return null;
	}
	const clientData = await isValidSlug(subdomain);

	if (!clientData.valid) {
		throw new Response("Not Found", { status: 404 });
	}

	return subdomain;
}

export const getCachedEtalaseData = cache(
	async (subdomain: string) => await getAllData(subdomain),
);

export const getTenantTheme = cache(async (subdomain: string) => {
	const data = await adminDB.query({
		tenants: {
			$: {
				fields: ["subdomain"],
				where: { subdomain: subdomain },
			},
			info: {
				$: {
					fields: ["theme"],
				},
			},
		},
	});

	const theme = data?.tenants[0]?.info?.theme;

	return theme;
});
