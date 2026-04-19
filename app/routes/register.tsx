import LoginCard from "@/components/auth/login-card";
import { GoogleOAuthProvider } from "@react-oauth/google";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
	return [
		{
			title: "Sign Up | Etalasee Online",
		},
		{
			name: "description",
			content: "Sign Up to Etalasee Online",
		},
		{
			openGraph: {
				title: "Sign Up | Etalasee Online",
				description: "Sign Up to Etalasee Online",
			},
			twitter: {
				title: "Sign Up | Etalasee Online",
				description: "Sign Up to Etalasee Online",
			},
		},
	];
};

export default function RegisterPage() {
	return (
		// biome-ignore lint/style/noNonNullAssertion: <false>
		<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID!}>
			<LoginCard />
		</GoogleOAuthProvider>
	);
}
