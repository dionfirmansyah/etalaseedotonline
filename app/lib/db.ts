/** biome-ignore-all lint/complexity/noBannedTypes: <explanation> */
import { init as initServer } from "@instantdb/admin";
import { type InstaQLEntity, init } from "@instantdb/react";
import schema from "../../instant.schema";

export const db = init({
	appId: import.meta.env.VITE_INSTANT_APP_ID!,
	schema,
});

export const adminDB = initServer({
	appId: import.meta.env.VITE_INSTANT_APP_ID!,
	schema,
	adminToken: import.meta.env.VITE_INSTANT_APP_ADMIN_TOKEN!,
});

export type User = InstaQLEntity<typeof schema, "$users">;
export type Profile = InstaQLEntity<typeof schema, "user_profiles">;

export type Category = InstaQLEntity<typeof schema, "categories">;
export type Subscription = InstaQLEntity<typeof schema, "subscriptions">;
export type Plan = InstaQLEntity<typeof schema, "plans">;
export type Info = InstaQLEntity<typeof schema, "tenant_info">;

export type Product = InstaQLEntity<
	typeof schema,
	"products",
	{ category: {} }
>;

export type Tenant = InstaQLEntity<
	typeof schema,
	"tenants",
	{
		owner: { user_profiles: {} };
		products: { product_images: {}; category: {} };
		subscription: { plan: {} };
		info: {};
		categories: {};
	}
>;
