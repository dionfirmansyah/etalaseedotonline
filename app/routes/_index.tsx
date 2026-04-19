import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getCachedEtalaseData, getSubdomain } from "@/lib/tenant";

import { adminDB, type Tenant } from "@/lib/db";
import type { Route } from "./+types/_index";
import HomeSubdomainPage from "@/routes/sudomain/HomeSubdomainPage";
import LandingPage from "@/components/LandingPage";

export async function loader({ request }: LoaderFunctionArgs) {
	const subdomain = await getSubdomain(request);

	if (!subdomain) {
		return { tenant: {} };
	}

	const tenant = await getCachedEtalaseData(subdomain);

	return { tenant };
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
	const { tenant } = loaderData;

	if (Object.keys(tenant).length > 0) {
		return <HomeSubdomainPage data={tenant as Tenant} />;
	}

	return <LandingPage />;
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
	const { tenant } = loaderData as { tenant: Tenant };
	const { name, description, info } = tenant;
	return [
		{ title: name || "Etalasee Online" },
		{
			name: "description",
			content: description || "Platform toko online cepat & mudah",
		},
		{
			property: "og:title",
			content: name || "Etalasee Online",
		},
		{
			property: "og:description",
			content: description || "Platform toko online cepat & mudah",
		},
		{
			name: "twitter:title",
			content: name || "Etalasee Online",
		},
		{
			name: "twitter:description",
			content: description || "Platform toko online cepat & mudah",
		},
		{
			name: "twitter:card",
			content: "summary_large_image",
		},
		{
			tagName: "link",
			rel: "icon",
			href: `${info?.logo ?? "/favicon.ico"}`,
			type: "image/png",
		},
	];
};
