interface DashboardProps {
	subdomain: string;
}

export default function DashboardSubdomainPage({ subdomain }: DashboardProps) {
	return (
		<div>
			<p>Hi, ini komponen Dashboard dari {subdomain}</p>
		</div>
	);
}
