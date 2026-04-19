import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import DashboardSubdomainPage from "@/routes/sudomain/DashboardSubPage";
import { getCachedEtalaseData, getSubdomain } from "@/lib/tenant";
import type { Route } from "./+types/dashboard";
import type { Tenant } from "@/lib/db";

export async function loader({ request }: LoaderFunctionArgs) {
	const subdomain = await getSubdomain(request);

	if (!subdomain) {
		return { subdomain: null, tenant: {} };
	}

	const tenant = await getCachedEtalaseData(subdomain);

	return { subdomain, tenant };
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
	const { tenant } = loaderData as { tenant: Tenant };
	const { name, description } = tenant;

	return [
		{ title: `Dashboard ${name ? ` - ${name}` : ""}` },
		{
			name: "description",
			content: description || "Platform toko online cepat & mudah",
		},
	];
};

export default function Dashboard({ loaderData }: Route.ComponentProps) {
	const { subdomain } = loaderData;

	if (subdomain) {
		return <DashboardSubdomainPage subdomain={subdomain} />;
	}

	return (
		<div>
			<h1>Dashboard utama</h1>
		</div>
	);
}
