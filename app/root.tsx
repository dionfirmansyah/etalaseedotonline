/** biome-ignore-all assist/source/organizeImports: <false> */
/** biome-ignore-all lint/style/noNonNullAssertion: <false> */
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	type LoaderFunctionArgs,
} from "react-router";

import "./app.css";
import { getSubdomain, getTenantTheme } from "./lib/tenant";
import { Toaster } from "sonner";

export async function loader({ request }: LoaderFunctionArgs) {
	const subdomain = await getSubdomain(request);

	if (!subdomain) {
		return { theme: "light" };
	}

	const theme = await getTenantTheme(subdomain!);

	return { theme };
}

export const links = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	const data = useLoaderData<typeof loader>() ?? { theme: "light" };
	const { theme } = data;

	return (
		<html lang="id" className={theme}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return (
		<NuqsAdapter>
			<Outlet />
			<Toaster richColors position="top-center" />
		</NuqsAdapter>
	);
}

export function ErrorBoundary({ error }: { error: unknown }) {
	let title = "Oops!";
	let message = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		title = error.status === 404 ? "404 - Not Found" : `Error ${error.status}`;
		message =
			error.status === 404
				? "Halaman yang Anda cari tidak ditemukan."
				: error.statusText || message;
	} else if (error instanceof Error) {
		message = error.message;
		stack = import.meta.env.DEV ? error.stack : undefined;
	}

	return (
		<html lang="id">
			<head>
				<title>{title}</title>
			</head>
			<body className="p-8">
				<div className="flex h-screen items-center justify-center flex-col">
					<h1 className="text-4xl font-bold">{title}</h1>
					<p className="text-gray-500 mt-2">{message}</p>
				</div>
				{stack && (
					<pre className="bg-gray-100 p-4 text-sm overflow-x-auto">
						<code>{stack}</code>
					</pre>
				)}
				<Scripts />
			</body>
		</html>
	);
}
