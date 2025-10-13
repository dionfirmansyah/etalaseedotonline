/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: <false> */
/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { SiInstagram, SiTiktok, SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import type { Info } from "@/lib/db";

interface TenantInfoProps {
	name: string;
	info: Info;
	description: string;
}

interface InfoItemProps {
	name: string;
	value: string;
	icon: React.ReactNode;
}

export default function TenantInfo({
	name,
	info,
	description,
}: TenantInfoProps) {
	if (!info) return null;

	const scrollToProducts = () => {
		document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" });
	};

	const InfoItem = ({ name, value, icon }: InfoItemProps) => {
		return (
			<div className="flex items-center gap-4">
				<Button
					variant={"custom"}
					className="bg-accent p-1"
					size={"icon"}
					asChild
				>
					<a href={`https://wa.me/${value}`} target="_blank">
						{icon}
					</a>
				</Button>
				<Button variant={"custom"} className="bg-accent w-full flex-1" asChild>
					<a
						href={`https://wa.me/${value}`}
						target="_blank"
						className="block w-full text-center"
					>
						<p className="text-primary text-sm">{name}</p>
					</a>
				</Button>
			</div>
		);
	};

	return (
		<div className="flex w-full flex-col items-center gap-2 p-4">
			<div className="rounded-full border-2 p-1">
				<Avatar className="size-24">
					<AvatarImage src={info.logo} />
					<AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
				</Avatar>
			</div>
			<div className="flex flex-col items-center gap-2">
				<h1 className="text-primary text-xl font-bold">{name}</h1>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>

			<div className="flex w-full flex-col gap-4 py-4">
				<InfoItem
					name="Whatsapp"
					value={info.whatsapp!}
					icon={<SiWhatsapp className="text-primary text-xs" />}
				/>
				<InfoItem
					name="Instagram"
					value={info.instagram!}
					icon={<SiInstagram className="text-primary text-xs" />}
				/>
				<InfoItem
					name="Tiktok"
					value={info.tiktok!}
					icon={<SiTiktok className="text-primary text-xs" />}
				/>
			</div>

			<Button
				variant={"custom"}
				className="w-full flex-1"
				onClick={scrollToProducts}
			>
				<p className="text-primary text-sm">Lihat Etalase</p>
			</Button>
		</div>
	);
}
