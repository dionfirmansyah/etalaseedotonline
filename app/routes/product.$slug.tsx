/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { useState, useMemo, useCallback } from "react";
import { useNavigate, useNavigation } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import type { Route } from "./+types/product.$slug";
import { adminDB, db, type Product } from "@/lib/db";
import { getSubdomain } from "@/lib/tenant";
import { formatRupiah } from "@/lib/utils";
import {
	ArrowLeft,
	Share2,
	ShoppingCart,
	Plus,
	Minus,
	ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiCarthrottle, SiWhatsapp } from "react-icons/si";
import { Spinner } from "@/components/ui/spinner";
import type { User } from "@instantdb/react";
import LoginAsGuestCard from "@/components/auth/login-as-guest-card";

export async function loader({ request, params }: LoaderFunctionArgs) {
	const subdomain = await getSubdomain(request);

	const data = await adminDB.query({
		tenants: {
			$: { fields: ["name", "description"], where: { subdomain: subdomain! } },
			info: {
				$: { fields: ["logo", "whatsapp"] },
			},
			products: {
				$: { where: { slug: params.slug } },
				category: {
					$: { fields: ["name"] },
				},
			},
		},
	});

	const tenantInfo = {
		name: data.tenants[0].name,
		description: data.tenants[0].description,
		whatsapp: data.tenants[0].info?.whatsapp,
		logo: data.tenants[0].info?.logo,
	};

	const product = data.tenants[0].products[0];

	if (product.isActive === false) {
		throw new Error("Product sudah tidak aktif");
	}

	if (product.deleted_at) {
		throw new Error("Product tidak ditemukan");
	}

	return { product, tenantInfo };
}

export default function ProductDetail({ loaderData }: Route.ComponentProps) {
	const navigate = useNavigate();
	const navigation = useNavigation();
	const isNavigating = navigation.state !== "idle";
	const { product, tenantInfo } = loaderData;
	const [quantity, setQuantity] = useState(1);

	const [isOpenLoginAsGuest, setIsOpenLoginAsGuest] = useState<boolean>(false);

	const productImages = useMemo(
		() => [
			"https://picsum.photos/id/231/800/600",
			"https://picsum.photos/id/238/800/600",
			"https://picsum.photos/id/239/800/600",
		],
		[],
	);

	const isOutOfStock = !product.stock || product.stock <= 0;
	const isLowStock = product.stock! > 0 && product.stock! <= 5;

	const handleQuantityChange = (delta: number) => {
		const newQuantity = quantity + delta;
		if (newQuantity >= 1 && newQuantity <= (product.stock || 0)) {
			setQuantity(newQuantity);
		}
	};

	const handleAddToCart = useCallback(() => {
		// Implement add to cart logic
		toast.success("Ditambahkan ke keranjang", {
			description: `${quantity}x ${product.name} berhasil ditambahkan`,
		});
	}, [quantity, product.name]);

	const handleGuestLogin = useCallback(async () => {
		try {
			await db.auth.signInAsGuest();

			toast.success("Ditambahkan ke keranjang", {
				description: `${quantity}x ${product.name} berhasil ditambahkan`,
			});
		} catch (err) {
			console.error(err);
			toast.error("Gagal Menambahkan ke Keranjang");
		}
	}, [quantity, product.name]);

	const handleBuyNow = useCallback(() => {
		const phoneNumber = tenantInfo.whatsapp;
		const productName = product.name;
		const qty = quantity;
		const price = product.price;
		const total = price * qty;

		// Pesan WhatsApp lebih profesional & diformat rapi dengan line break
		const message = `
        Saya ingin melakukan pemesanan:
        
        *Produk:* ${productName}
        *Jumlah:* ${qty}
        *Total:* Rp ${total.toLocaleString("id-ID")}`;

		// Buat link WA dengan encodeURIComponent agar format aman
		const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message.trim())}`;

		// Validasi sederhana
		if (!qty || qty <= 0) {
			toast.error("Jumlah produk belum diisi", {
				description: "Masukkan jumlah produk yang ingin dibeli.",
			});
			return;
		}

		// Buka WhatsApp
		window.open(url, "_blank");

		toast.success("Menghubungkan ke WhatsApp...", {
			description: "Silakan lanjutkan pemesanan Anda di WhatsApp.",
		});
	}, [tenantInfo.whatsapp, product.name, quantity, product.price]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <false>
	const handleShare = useCallback(async () => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: product.name,
					text: product.descriptions,
					url: window.location.href,
				});
			} catch (err) {
				console.log("Share cancelled");
			}
		} else {
			// Fallback: copy to clipboard
			navigator.clipboard.writeText(window.location.href);
			toast.success("Link tersalin", {
				description: "Link produk telah disalin ke clipboard",
			});
		}
	}, []);

	return (
		<div className="min-h-screen max-w-lg mx-auto bg-background">
			{/* Header */}
			<header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-primary">
				<div className="container flex items-center justify-between h-14 px-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate("/#products")}
						className="hover:bg-accent"
					>
						{isNavigating ? (
							<Spinner className="size-4 text-primary" />
						) : (
							<ArrowLeft className="h-5 w-5 text-primary" />
						)}
					</Button>
					<h1 className="text-sm font-semibold text-primary truncate flex-1 mx-4">
						Detail Produk
					</h1>

					<db.SignedIn>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleShare}
							className="hover:bg-accent"
						>
							<Share2 className="h-5 w-5 text-primary" />
						</Button>
						<CartButton />
					</db.SignedIn>
					<db.SignedOut>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleShare}
							className="hover:bg-accent"
						>
							<Share2 className="h-5 w-5 text-primary" />
						</Button>
					</db.SignedOut>
				</div>
			</header>

			{/* Main Content */}
			<main className="container px-4 pb-24">
				{/* Image Carousel */}
				<div className="py-4">
					<Carousel className="w-full">
						<CarouselContent>
							{productImages.map((image, index) => (
								<CarouselItem key={index}>
									<div className="aspect-square bg-accent rounded-lg overflow-hidden">
										<img
											src={image}
											alt={`${product.name} - ${index + 1}`}
											className="w-full h-full object-cover"
											loading={index === 0 ? "eager" : "lazy"}
										/>
									</div>
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious className="left-2" />
						<CarouselNext className="right-2" />
					</Carousel>
				</div>

				{/* Product Info */}
				<div className="space-y-4">
					{/* Price & Stock */}
					<Card className="border-primary">
						<CardContent className="p-4 space-y-3">
							<div className="flex items-start justify-between">
								<div className="space-y-1">
									<h2 className="text-2xl font-bold text-primary">
										{formatRupiah(product.price)}
									</h2>
									<h3 className="text-lg font-semibold text-foreground">
										{product.name}
									</h3>
								</div>
								{product.category && (
									<Badge variant="outline" className="text-xs text-primary">
										{product.category.name}
									</Badge>
								)}
							</div>

							{/* Stock Status */}
							<div className="flex items-center gap-2">
								{isOutOfStock ? (
									<Badge variant="destructive" className="text-xs">
										Stok Habis
									</Badge>
								) : isLowStock ? (
									<Badge variant="default" className="text-xs">
										Stok Sisa: {product.stock}
									</Badge>
								) : (
									<span className="text-sm text-muted-foreground">
										Stok: {product.stock}
									</span>
								)}
							</div>

							{/* Low Stock Alert */}
							{isLowStock && (
								<Alert
									variant="default"
									className="border-amber-500 bg-amber-500/30 flex items-center justify-center"
								>
									<AlertDescription className="text-xs text-amber-600">
										Stok terbatas! Segera pesan sebelum kehabisan
									</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>

					{/* Description */}
					<Card className="border-primary">
						<CardContent className="p-4 space-y-3">
							<h4 className="font-semibold text-primary">Deskripsi Produk</h4>
							<Separator className="bg-primary/20" />
							<p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
								{product.descriptions || "Tidak ada deskripsi produk."}
							</p>
						</CardContent>
					</Card>

					{/* Product Details */}
					{product.category && (
						<Card className="border-primary">
							<CardContent className="p-4 space-y-3">
								<h4 className="font-semibold text-primary">Detail Produk</h4>
								<Separator className="bg-primary/20" />
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Kategori</span>
										<span className="font-medium">{product.category.name}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Kondisi</span>
										<span className="font-medium">Baru</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Berat</span>
										<span className="font-medium">-</span>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</main>

			{/* Bottom Action Bar */}
			<div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-background border-t border-primary p-4 shadow-lg">
				<div className="container flex items-center gap-3">
					{/* Quantity Selector */}
					{!isOutOfStock && (
						<div className="flex items-center border border-primary rounded-md">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => handleQuantityChange(-1)}
								disabled={quantity <= 1}
								className="h-10 w-10 rounded-r-none hover:bg-accent"
							>
								<Minus className="h-4 w-4 text-primary" />
							</Button>
							<div className="w-12 text-center">
								<span className="text-sm font-medium text-primary">
									{quantity}
								</span>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => handleQuantityChange(1)}
								disabled={quantity >= (product.stock || 0)}
								className="h-10 w-10 rounded-l-none hover:bg-accent"
							>
								<Plus className="h-4 w-4 text-primary" />
							</Button>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex-1 flex gap-2">
						{isOutOfStock ? (
							<Button variant="outline" className="flex-1" disabled>
								Stok Habis
							</Button>
						) : (
							<>
								{/* <db.SignedIn>
									<Button
										variant="outline"
										className="flex-1"
										onClick={handleAddToCart}
									>
										<ShoppingCart className="size-4 mr-2 text-primary" />
										<p className="text-primary">Keranjang</p>
									</Button>
								</db.SignedIn>
								<db.SignedOut>
									<Button
										variant="outline"
										className="flex-1"
										onClick={handleGuestLogin}
									>
										<ShoppingCart className="size-4 mr-2 text-primary" />
										<p className="text-primary">Keranjang</p>
									</Button>
								</db.SignedOut> */}
								<Button className="flex-1" onClick={handleBuyNow}>
									<SiWhatsapp className="h-4 w-4 mr-2 text-accent" />
									<p className="text-accent">Pesan Sekarang</p>
								</Button>
							</>
						)}
					</div>
					<LoginAsGuestCard
						isOpen={isOpenLoginAsGuest}
						onOpenChange={setIsOpenLoginAsGuest}
					/>
				</div>
			</div>
		</div>
	);
}

const CartButton = () => {
	const navigate = useNavigate();

	const handleNavigateToCart = () => {
		navigate("/cart");
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={handleNavigateToCart}
			className="hover:bg-accent"
		>
			<ShoppingBag className="h-5 w-5 text-primary" />
		</Button>
	);
};

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
	const { tenantInfo, product } = loaderData as {
		tenantInfo: { name: string; description: string; logo: string };
		product: Product;
	};
	const { name, description, logo } = tenantInfo;

	return [
		{ title: `${product.name} by ${name}` || "Etalasee Online" },
		{
			name: "description",
			content: description || "Platform toko online cepat & mudah",
		},
		{
			openGraph: {
				title: `${product.name} by ${name}`,
				description: `${description}`,
			},
			twitter: {
				title: `${product.name} by ${name}`,
				description: `${description}`,
			},
		},
		{
			tagName: "link",
			rel: "icon",
			href: `${logo ?? "/favicon.ico"}`,
			type: "image/png",
		},
	];
};
