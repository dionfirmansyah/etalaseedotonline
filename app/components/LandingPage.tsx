/** biome-ignore-all lint/correctness/useUniqueElementIds: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { adminDB } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Store,
	ShoppingBag,
	Shield,
	Zap,
	Globe,
	ArrowRight,
	Check,
	Star,
	MapPin,
	ChevronRight,
	Smartphone,
	BarChart3,
	MessageCircle,
	Search,
	Package,
	X,
	LayoutGrid,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryPublic = {
	id: string;
	name: string;
	slug: string;
	icon: string;
};

type TenantPublic = {
	id: string;
	name: string;
	description?: string;
	subdomain: string;
	info?: {
		logo?: string;
		location?: string;
	};
	categories?: CategoryPublic[];
};

type ProductPublic = {
	id: string;
	name: string;
	price: number;
	descriptions?: string;
	slug: string;
	isActive: boolean;
	deleted_at?: string;
	category?: { name: string };
	tenant?: { id: string; name: string; subdomain: string };
};

type SearchResults = {
	tenants: TenantPublic[];
	products: ProductPublic[];
};

// ─── Static Data ──────────────────────────────────────────────────────────────

const FEATURES = [
	{
		icon: Smartphone,
		title: "Toko Mobile-Friendly",
		desc: "Tampilan toko otomatis optimal di semua perangkat, HP hingga desktop.",
	},
	{
		icon: Globe,
		title: "Subdomain Sendiri",
		desc: "Dapatkan alamat toko unik seperti tokoku.etalasee.id secara gratis.",
	},
	{
		icon: MessageCircle,
		title: "Pesan via WhatsApp",
		desc: "Pembeli langsung pesan ke WhatsApp kamu, tanpa biaya transaksi.",
	},
	{
		icon: BarChart3,
		title: "Kelola Produk Mudah",
		desc: "Tambah, edit, dan atur stok produk kapan saja dari genggaman.",
	},
	{
		icon: Zap,
		title: "Setup Cepat 5 Menit",
		desc: "Toko siap online dalam hitungan menit, tanpa butuh keahlian teknis.",
	},
	{
		icon: Shield,
		title: "Aman & Terpercaya",
		desc: "Data kamu terlindungi, toko kamu selalu online setiap saat.",
	},
];

const PLANS = [
	{
		name: "Basic",
		price: 20000,
		description: "Cocok untuk UMKM yang baru mulai berjualan online.",
		features: [
			"1 Toko Online",
			"Subdomain gratis",
			"Hingga 20 produk",
			"Pesan via WhatsApp",
			"Tampilan mobile-friendly",
		],
		highlighted: false,
		badge: null,
	},
	{
		name: "Premium",
		price: 50000,
		description: "Untuk UMKM yang ingin tampil lebih profesional.",
		features: [
			"1 Toko Online",
			"Subdomain gratis",
			"Produk tidak terbatas",
			"Pesan via WhatsApp",
			"Tampilan mobile-friendly",
			"Multiple gambar produk",
			"Kategori produk",
			"Prioritas support",
		],
		highlighted: true,
		badge: "Paling Populer",
	},
];

const TESTIMONIALS = [
	{
		name: "Sari Dewi",
		store: "Dapur Sari",
		location: "Bandung",
		text: "Sekarang pelanggan bisa lihat semua produk saya dengan rapi. Pesanan WhatsApp makin banyak!",
		avatar: "SD",
		rating: 5,
	},
	{
		name: "Budi Santoso",
		store: "Batik Tulis Jaya",
		location: "Solo",
		text: "Setup-nya mudah banget, dalam 10 menit toko saya sudah online. Recommended!",
		avatar: "BS",
		rating: 5,
	},
	{
		name: "Rini Hartati",
		store: "Herbal Rempah Nusantara",
		location: "Yogyakarta",
		text: "Harganya sangat terjangkau tapi fiturnya lengkap. Toko saya makin profesional.",
		avatar: "RH",
		rating: 5,
	},
];

const STEPS = [
	{
		number: "01",
		title: "Daftar Akun",
		desc: "Buat akun gratis dengan email kamu.",
	},
	{
		number: "02",
		title: "Buat Toko",
		desc: "Isi nama toko dan pilih subdomain unikmu.",
	},
	{
		number: "03",
		title: "Tambah Produk",
		desc: "Upload foto dan isi detail produk kamu.",
	},
	{
		number: "04",
		title: "Toko Online!",
		desc: "Bagikan link toko dan mulai terima pesanan.",
	},
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRupiah(amount: number) {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
	}).format(amount);
}

function getInitials(name: string) {
	return name
		.split(" ")
		.slice(0, 2)
		.map((w) => w[0])
		.join("")
		.toUpperCase();
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const handler = () => setScrolled(window.scrollY > 10);
		window.addEventListener("scroll", handler);
		return () => window.removeEventListener("scroll", handler);
	}, []);

	return (
		<header
			className={`sticky top-0 z-50 w-full transition-all duration-200 ${
				scrolled
					? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-sm"
					: "bg-transparent"
			}`}
		>
			<div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
				<Link to="/" className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
						<Store className="w-4 h-4 text-primary-foreground" />
					</div>
					<span className="text-base font-semibold text-primary">Etalasee</span>
				</Link>

				<nav className="hidden md:flex items-center gap-6">
					{[
						{ href: "#features", label: "Fitur" },
						{ href: "#explore", label: "Jelajahi" },
						{ href: "#pricing", label: "Harga" },
						{ href: "#how", label: "Cara Kerja" },
					].map((item) => (
						<a
							key={item.href}
							href={item.href}
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							{item.label}
						</a>
					))}
				</nav>

				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" asChild>
						<Link to="/login">Masuk</Link>
					</Button>
					<Button size="sm" asChild>
						<Link to="/register">
							<span className="text-primary-foreground">Daftar Gratis</span>
						</Link>
					</Button>
				</div>
			</div>
		</header>
	);
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
	return (
		<section className="relative bg-gradient-to-br from-primary to-secondary overflow-hidden px-4 pt-8 pb-12">
			<div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
			<div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

			<div className="max-w-5xl mx-auto relative z-10">
				<div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3 py-1 mb-5">
					<div className="w-2 h-2 rounded-full bg-green-300" />
					<span className="text-xs text-white/90">
						Platform UMKM Digital #1
					</span>
				</div>

				<h1 className="text-2xl md:text-4xl font-semibold text-white leading-tight mb-4 max-w-xl">
					Buka Toko Online UMKM-mu dalam 5 Menit
				</h1>
				<p className="text-sm md:text-base text-white/75 leading-relaxed mb-8 max-w-lg">
					Etalasee membantu ribuan UMKM Indonesia tampil profesional di dunia
					digital. Toko online sendiri, subdomain gratis, pesan langsung via
					WhatsApp.
				</p>

				<div className="flex  gap-3">
					<Button
						size="lg"
						variant="outline"
						className="bg-white text-primary hover:bg-white/90 font-medium"
						asChild
					>
						<a href="#explore">Jelajahi Produk & Toko</a>
					</Button>
					<Button
						size="lg"
						variant="outline"
						className="border-white/40 text-white bg-transparent hover:bg-white/10"
						asChild
					>
						<Link to="/register">
							Daftar Toko <ArrowRight className="w-4 h-4 ml-2" />
						</Link>
					</Button>
				</div>

				<div className="grid grid-cols-3 gap-2 mt-10 bg-white/10 rounded-xl overflow-hidden border border-white/15">
					{[
						{ num: "1.2K+", label: "UMKM Terdaftar" },
						{ num: "24K+", label: "Produk Aktif" },
						{ num: "18K+", label: "Pembeli Puas" },
					].map((stat) => (
						<div
							key={stat.label}
							className="py-4 text-center border-r border-white/15 last:border-r-0"
						>
							<p className="text-xl font-semibold text-white">{stat.num}</p>
							<p className="text-xs text-white/65 mt-0.5">{stat.label}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── Explore (Search + Filter + Results) ─────────────────────────────────────

function ExploreSection() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const queryFromUrl = searchParams.get("q") ?? "";
	const categoryFromUrl = searchParams.get("category") ?? "";

	const [inputValue, setInputValue] = useState(queryFromUrl);

	const [allTenants, setAllTenants] = useState<TenantPublic[]>([]);
	const [allProducts, setAllProducts] = useState<ProductPublic[]>([]);
	const [categories, setCategories] = useState<CategoryPublic[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [hasFetched, setHasFetched] = useState(false);

	// Sync local input when browser back/forward
	useEffect(() => {
		setInputValue(queryFromUrl);
	}, [queryFromUrl]);

	// Fetch deduplicated categories for filter chips
	useEffect(() => {
		const run = async () => {
			try {
				const data = await adminDB.query({
					categories: { $: { fields: ["id", "name", "slug", "icon"] } },
				});
				const seen = new Set<string>();
				const unique = (data.categories as CategoryPublic[]).filter((c) => {
					if (seen.has(c.name)) return false;
					seen.add(c.name);
					return true;
				});
				setCategories(unique);
			} catch (err) {
				console.error("Failed to fetch categories:", err);
			}
		};
		run();
	}, []);

	// Fetch tenants + products whenever URL params change
	useEffect(() => {
		const isDefaultView = !queryFromUrl && !categoryFromUrl;

		const run = async () => {
			setIsLoading(true);
			try {
				if (isDefaultView) {
					// Default: show featured public tenants only, no products
					const data = await adminDB.query({
						tenants: {
							$: {
								where: { is_public: true },
								limit: 8,
								order: { serverCreatedAt: "desc" },
							},
							info: { $: { fields: ["logo", "location"] } },
						},
						products: {
							$: {
								fields: ["name", "price", "slug"],
								where: { isActive: true, deleted_at: { $isNull: true } },
								limit: 8,
								order: { serverCreatedAt: "desc" },
							},
							tenant: {
								$: {
									fields: ["name", "subdomain"],
								},
							},
						},
					});
					setAllTenants(data.tenants as TenantPublic[]);
					setAllProducts(data.products as ProductPublic[]);
					console.log("Product", data.products);
				} else {
					// Search mode: fetch all public tenants (with categories) + active products
					const productWhere: Record<string, unknown> = {
						isActive: true,
						deleted_at: { $isNull: true },
					};

					if (categoryFromUrl) {
						productWhere["category.name"] = categoryFromUrl;
					}

					const [tenantsRes, productsRes] = await Promise.all([
						adminDB.query({
							tenants: {
								$: { where: { is_public: true } },
								info: { $: { fields: ["logo", "location"] } },
								categories: { $: { fields: ["id", "name", "slug"] } },
							},
						}),
						adminDB.query({
							products: {
								$: { where: { "category.name": categoryFromUrl }, limit: 40 },
								category: { $: { fields: ["name"] } },
								tenant: { $: { fields: ["id", "name", "subdomain"] } },
							},
						}),
					]);

					setAllTenants(tenantsRes.tenants as unknown as TenantPublic[]);
					setAllProducts(productsRes.products as unknown as ProductPublic[]);
				}
			} catch (err) {
				console.error("Search fetch failed:", err);
			} finally {
				setIsLoading(false);
				setHasFetched(true);
			}
		};

		run();
	}, [queryFromUrl, categoryFromUrl]);

	// Client-side filtering
	const results = useMemo<SearchResults>(() => {
		const q = queryFromUrl.toLowerCase().trim();
		const isDefaultView = !q && !categoryFromUrl;

		if (isDefaultView) {
			return { tenants: allTenants, products: [] };
		}

		// Filter products
		const filteredProducts = allProducts.filter((p) => {
			const matchesQuery =
				!q ||
				p.name.toLowerCase().includes(q) ||
				(p.descriptions ?? "").toLowerCase().includes(q);
			const matchesCategory =
				!categoryFromUrl || p.category?.name === categoryFromUrl;
			return matchesQuery && matchesCategory;
		});

		// Tenant IDs that have matching products
		const tenantIdsWithProducts = new Set(
			filteredProducts.map((p) => p.tenant?.id).filter(Boolean),
		);

		// Filter tenants: name/description matches OR has matching product
		const filteredTenants = allTenants.filter((t) => {
			const matchesQuery =
				!q ||
				t.name.toLowerCase().includes(q) ||
				(t.description ?? "").toLowerCase().includes(q) ||
				tenantIdsWithProducts.has(t.id);

			const matchesCategory =
				!categoryFromUrl ||
				(t.categories ?? []).some((c) => c.name === categoryFromUrl);

			return matchesQuery && matchesCategory;
		});

		return { tenants: filteredTenants, products: filteredProducts };
	}, [queryFromUrl, categoryFromUrl, allTenants, allProducts]);

	const isSearchMode = !!(queryFromUrl || categoryFromUrl);
	const totalResults = results.tenants.length + results.products.length;

	const handleSearch = useCallback(() => {
		const params = new URLSearchParams(searchParams);
		if (inputValue.trim()) {
			params.set("q", inputValue.trim());
		} else {
			params.delete("q");
		}
		navigate(`/?${params.toString()}#explore`);
	}, [inputValue, navigate, searchParams]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") handleSearch();
		},
		[handleSearch],
	);

	const handleCategoryToggle = useCallback(
		(name: string) => {
			const params = new URLSearchParams(searchParams);
			if (categoryFromUrl === name) {
				params.delete("category");
			} else {
				params.set("category", name);
			}
			navigate(`/?${params.toString()}#explore`);
		},
		[categoryFromUrl, navigate, searchParams],
	);

	const removeQueryParam = useCallback(
		(key: "q" | "category") => {
			const params = new URLSearchParams(searchParams);
			params.delete(key);
			if (key === "q") setInputValue("");
			navigate(`/?${params.toString()}#explore`);
		},
		[navigate, searchParams],
	);

	const clearAll = useCallback(() => {
		setInputValue("");
		navigate("/#explore");
	}, [navigate]);

	return (
		<section id="explore" className="py-4 px-4 bg-background">
			<div className="max-w-5xl mx-auto space-y-4">
				{/* Search bar */}
				<div className="flex gap-2 max-w-2xl mx-auto">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<Input
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Cari produk atau nama toko..."
							className="pl-9 pr-9 border-border focus-visible:ring-primary"
						/>
						{inputValue && (
							<button
								type="button"
								onClick={() => setInputValue("")}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>
					<Button onClick={handleSearch} className="shrink-0" size="icon">
						<Search className="text-primary-foreground" />
					</Button>
				</div>
				{/* Category chips */}

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex justify-between">
							<h3 className="text-sm font-medium text-foreground flex items-center gap-2">
								<LayoutGrid className="w-4 h-4 text-primary" />
								Kategori
							</h3>
						</div>

						{!isSearchMode ? (
							<Button
								variant="ghost"
								size="sm"
								className="text-xs text-primary h-auto py-1"
							>
								Lihat semua <ChevronRight className="w-3 h-3 ml-1" />
							</Button>
						) : (
							<div className="flex items-center  gap-2 flex-wrap ">
								<div className="flex items-center gap-2 flex-wrap">
									{queryFromUrl && (
										<span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs">
											"{queryFromUrl}"
											<button
												type="button"
												onClick={() => removeQueryParam("q")}
											>
												<X className="w-3 h-3 ml-0.5 cursor-pointer" />
											</button>
										</span>
									)}
									{categoryFromUrl && (
										<span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs">
											{categoryFromUrl}
											<button
												type="button"
												onClick={() => removeQueryParam("category")}
											>
												<X className="w-3 h-3 ml-0.5 cursor-pointer" />
											</button>
										</span>
									)}
								</div>
								{!isLoading && (
									<p className="text-xs text-muted-foreground shrink-0">
										{totalResults} hasil ditemukan
									</p>
								)}
							</div>
						)}
					</div>
					<div className="pb-4">
						<div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
							{/* ALL / SEMUA */}
							{(() => {
								const isActive = categoryFromUrl === "";

								return (
									<CardContent
										key="all"
										onClick={() => removeQueryParam("category")}
										className="px-0 flex min-w-[64px] cursor-pointer flex-col items-center gap-1.5"
									>
										<div
											className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-[22px] transition
              ${
								isActive
									? "border-2 border-primary   text-white "
									: " border border-gray-200  "
							}`}
										>
											🛍️
										</div>

										<div
											className={`whitespace-nowrap text-[10px] text-center
              ${isActive ? "font-medium text-primary " : " text-gray-500"}`}
										>
											Semua
										</div>
									</CardContent>
								);
							})()}

							{/* DYNAMIC CATEGORIES */}
							{categories.map((cat) => {
								const isActive = categoryFromUrl === cat.name;

								return (
									<CardContent
										key={cat.id}
										onClick={() => handleCategoryToggle(cat.name)}
										className="px-0 flex min-w-[64px] cursor-pointer flex-col items-center gap-1.5"
									>
										<div
											className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-[22px] transition
              ${
								isActive
									? "border-2 border-primary   text-primary"
									: "border border-gray-200  text-gray-600"
							}`}
										>
											{cat.icon ? cat.icon : cat.name.charAt(0)}
										</div>

										<div
											className={`whitespace-nowrap text-[10px] text-center
              ${isActive ? "font-medium text-primary" : "text-gray-500"}`}
										>
											{cat.name}
										</div>
									</CardContent>
								);
							})}
						</div>
					</div>
				</div>

				<div className="relative mb-4 flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary p-4">
					<div className="absolute -right-5 -top-5 h-[100px] w-[100px] rounded-full bg-white/10" />

					<div className="flex-1">
						<div className="mb-1 inline-block rounded-full bg-white/15 px-2 py-[2px] text-[10px] text-white/70">
							Program UMKM Go Digital
						</div>

						<div className="mb-2 text-sm font-medium leading-snug text-white">
							Daftarkan toko kamu
							<br />
							gratis & mulai berjualan
						</div>

						<Button className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-primary">
							Daftar Sekarang
						</Button>
					</div>
				</div>

				{/* Loading skeletons */}
				{isLoading && (
					<div className="space-y-6">
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-36 rounded-xl bg-gray-300" />
							))}
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-48 rounded-xl bg-gray-300" />
							))}
						</div>
					</div>
				)}

				{/* Results */}
				{!isLoading && hasFetched && (
					<div className="space-y-8">
						{/* Tenants */}
						{results.tenants.length > 0 && (
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-medium text-foreground flex items-center gap-2">
										<Store className="w-4 h-4 text-primary" />
										{isSearchMode ? "Toko" : "UMKM Pilihan"}
									</h3>
									{!isSearchMode && (
										<Button
											variant="ghost"
											size="sm"
											className="text-xs text-primary h-auto py-1"
										>
											Lihat semua <ChevronRight className="w-3 h-3 ml-1" />
										</Button>
									)}
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
									{results.tenants.map((tenant) => (
										<TenantCard key={tenant.id} tenant={tenant} />
									))}
								</div>
							</div>
						)}

						{/* Products — only in search mode */}

						<div className="space-y-4">
							<div className="flex justify-between">
								<h3 className="text-sm font-medium text-foreground flex items-center gap-2">
									<Package className="w-4 h-4 text-primary" />
									Produk Terbaru
								</h3>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
								{allProducts.map((product) => (
									<ProductCard key={product.id} product={product} />
								))}
							</div>
						</div>

						{/* Empty state */}
						{isSearchMode && totalResults === 0 && (
							<div className="text-center py-16 space-y-3">
								<div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
									<Search className="w-6 h-6 text-muted-foreground" />
								</div>
								<p className="text-sm font-medium text-foreground">
									Tidak ada hasil untuk pencarian ini
								</p>
								<p className="text-xs text-muted-foreground">
									Coba kata kunci lain atau hapus filter kategori
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={clearAll}
									className="text-primary border-primary/40 mt-2"
								>
									Hapus pencarian
								</Button>
							</div>
						)}
					</div>
				)}
			</div>
		</section>
	);
}

// ─── Tenant Card ──────────────────────────────────────────────────────────────

function TenantCard({ tenant }: { tenant: TenantPublic }) {
	return (
		<a
			href={`https://${tenant.subdomain}.etalasee.online`}
			target="_blank"
			rel="noopener noreferrer"
			className="group"
		>
			<Card className="border-border group-hover:border-primary/40 transition-colors overflow-hidden h-full">
				<div className="h-20 bg-primary/10 flex items-center justify-center relative">
					{tenant.info?.logo ? (
						<img
							src={tenant.info.logo}
							alt={tenant.name}
							className="w-full h-full object-cover"
						/>
					) : (
						<Store className="w-8 h-8 text-primary/30" />
					)}
					<div className="absolute -bottom-4 left-3 w-8 h-8 rounded-full bg-primary border-2 border-background flex items-center justify-center">
						<span className="text-[10px] font-medium text-primary-foreground">
							{getInitials(tenant.name)}
						</span>
					</div>
				</div>
				<CardContent className="pt-6 pb-3 px-3">
					<p className="text-xs font-medium text-foreground truncate">
						{tenant.name}
					</p>
					{tenant.info?.location && (
						<div className="flex items-center gap-1 mt-1">
							<MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
							<p className="text-[10px] text-muted-foreground truncate">
								{tenant.info.location}
							</p>
						</div>
					)}
					{tenant.description && (
						<p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
							{tenant.description}
						</p>
					)}
				</CardContent>
			</Card>
		</a>
	);
}

// ─── Category Card ──────────────────────────────────────────────────────────────

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: ProductPublic }) {
	const productUrl = product.tenant
		? `https://${product.tenant.subdomain}.etalasee.online/product/${product.slug}`
		: "#";

	return (
		<a
			href={productUrl}
			target="_blank"
			rel="noopener noreferrer"
			className="group"
		>
			<Card className="border-border group-hover:border-primary/40 transition-colors overflow-hidden h-full">
				<div className="aspect-square bg-primary/5 flex items-center justify-center overflow-hidden">
					<Package className="w-10 h-10 text-primary/20" />
				</div>
				<CardContent className="p-3 space-y-1">
					{product.tenant && (
						<p className="text-[10px] text-muted-foreground truncate">
							{product.tenant.name}
						</p>
					)}
					<p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
						{product.name}
					</p>
					<p className="text-xs font-semibold text-primary">
						{formatRupiah(product.price)}
					</p>
					{/* {product.stock && (
						<Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
							{product.stock}
						</Badge>
					)} */}
				</CardContent>
			</Card>
		</a>
	);
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
	return (
		<section id="features" className="py-16 px-4 bg-secondary/30">
			<div className="max-w-5xl mx-auto">
				<div className="text-center mb-10">
					<h2 className="text-2xl font-semibold text-foreground mb-2">
						Semua yang kamu butuhkan untuk jualan online
					</h2>
					<p className="text-sm text-muted-foreground max-w-md mx-auto">
						Tanpa ribet, tanpa biaya transaksi, langsung terhubung ke pelanggan.
					</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
					{FEATURES.map((f) => (
						<Card
							key={f.title}
							className="border-border hover:border-primary/40 transition-colors"
						>
							<CardContent className="p-5 space-y-3">
								<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
									<f.icon className="w-5 h-5 text-primary" />
								</div>
								<h3 className="text-sm font-medium text-foreground">
									{f.title}
								</h3>
								<p className="text-xs text-muted-foreground leading-relaxed">
									{f.desc}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
	return (
		<section id="how" className="py-16 px-4 bg-background">
			<div className="max-w-5xl mx-auto">
				<div className="text-center mb-10">
					<Badge
						variant="outline"
						className="text-primary border-primary/30 mb-3"
					>
						Cara Kerja
					</Badge>
					<h2 className="text-2xl font-semibold text-foreground mb-2">
						Toko online dalam 4 langkah mudah
					</h2>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
					{STEPS.map((step, i) => (
						<div key={step.number} className="relative">
							{i < STEPS.length - 1 && (
								<div className="hidden md:block absolute top-5 left-[calc(50%+24px)] w-full h-px bg-border" />
							)}
							<div className="flex flex-col items-center text-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center relative z-10">
									<span className="text-xs font-semibold text-primary">
										{step.number}
									</span>
								</div>
								<div>
									<p className="text-sm font-medium text-foreground">
										{step.title}
									</p>
									<p className="text-xs text-muted-foreground mt-1 leading-relaxed">
										{step.desc}
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

function PricingSection() {
	return (
		<section id="pricing" className="py-16 px-4 bg-secondary/30">
			<div className="max-w-5xl mx-auto">
				<div className="text-center mb-10">
					<Badge
						variant="outline"
						className="text-primary border-primary/30 mb-3"
					>
						Harga
					</Badge>
					<h2 className="text-2xl font-semibold text-foreground mb-2">
						Harga terjangkau untuk semua UMKM
					</h2>
					<p className="text-sm text-muted-foreground">
						Bayar per bulan, batalkan kapan saja.
					</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
					{PLANS.map((plan) => (
						<Card
							key={plan.name}
							className={`relative overflow-hidden ${
								plan.highlighted ? "border-primary shadow-md" : "border-border"
							}`}
						>
							{plan.badge && (
								<div className="absolute top-0 right-0">
									<Badge className="rounded-none rounded-bl-lg text-primary-foreground text-xs">
										{plan.badge}
									</Badge>
								</div>
							)}
							<CardContent className="p-6 space-y-5">
								<div>
									<p className="text-sm font-medium text-muted-foreground">
										{plan.name}
									</p>
									<div className="flex items-baseline gap-1 mt-1">
										<span className="text-3xl font-semibold text-foreground">
											{formatRupiah(plan.price)}
										</span>
										<span className="text-sm text-muted-foreground">
											/bulan
										</span>
									</div>
									<p className="text-xs text-muted-foreground mt-2 leading-relaxed">
										{plan.description}
									</p>
								</div>
								<Separator />
								<ul className="space-y-2.5">
									{plan.features.map((f) => (
										<li key={f} className="flex items-start gap-2">
											<Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
											<span className="text-sm text-foreground">{f}</span>
										</li>
									))}
								</ul>
								<Button
									className="w-full"
									variant={plan.highlighted ? "default" : "outline"}
									asChild
								>
									<Link to="/register">
										<span
											className={
												plan.highlighted
													? "text-primary-foreground"
													: "text-primary"
											}
										>
											Mulai dengan {plan.name}
										</span>
									</Link>
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function TestimonialsSection() {
	return (
		<section className="py-16 px-4 bg-background">
			<div className="max-w-5xl mx-auto">
				<div className="text-center mb-10">
					<Badge
						variant="outline"
						className="text-primary border-primary/30 mb-3"
					>
						Testimoni
					</Badge>
					<h2 className="text-2xl font-semibold text-foreground mb-2">
						Kata mereka yang sudah bergabung
					</h2>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{TESTIMONIALS.map((t) => (
						<Card key={t.name} className="border-border">
							<CardContent className="p-5 space-y-4">
								<div className="flex gap-0.5">
									{Array.from({ length: t.rating }).map((_, i) => (
										<Star
											key={i}
											className="w-3.5 h-3.5 fill-primary text-primary"
										/>
									))}
								</div>
								<p className="text-sm text-foreground leading-relaxed">
									"{t.text}"
								</p>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
										<span className="text-[10px] font-medium text-primary-foreground">
											{t.avatar}
										</span>
									</div>
									<div>
										<p className="text-xs font-medium text-foreground">
											{t.name}
										</p>
										<p className="text-[10px] text-muted-foreground">
											{t.store} · {t.location}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

function CTASection() {
	return (
		<section className="py-16 px-4 bg-primary">
			<div className="max-w-5xl mx-auto text-center relative overflow-hidden">
				<div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
				<div className="relative z-10">
					<ShoppingBag className="w-10 h-10 text-white/60 mx-auto mb-4" />
					<h2 className="text-2xl font-semibold text-white mb-3">
						Siap buka toko online-mu?
					</h2>
					<p className="text-sm text-white/70 mb-8 max-w-md mx-auto">
						Bergabung bersama ribuan UMKM yang sudah tampil profesional di
						Etalasee. Gratis untuk memulai.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Button
							size="lg"
							className="bg-white text-primary hover:bg-white/90 font-medium"
							asChild
						>
							<Link to="/register">
								Daftar Sekarang — Gratis!{" "}
								<ArrowRight className="w-4 h-4 ml-2" />
							</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="border-white/40 text-white bg-transparent hover:bg-white/10"
							asChild
						>
							<Link to="/login">Sudah punya akun? Masuk</Link>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
	return (
		<footer className="bg-background border-t border-border px-4 py-8">
			<div className="max-w-5xl mx-auto">
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
							<Store className="w-3.5 h-3.5 text-primary-foreground" />
						</div>
						<span className="text-sm font-medium text-primary">Etalasee</span>
					</div>
					<p className="text-xs text-muted-foreground text-center">
						© {new Date().getFullYear()} Etalasee. Platform etalase digital
						untuk UMKM Indonesia.
					</p>
					<div className="flex items-center gap-4">
						<Link
							to="/privacy"
							className="text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							Privasi
						</Link>
						<Link
							to="/terms"
							className="text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							Syarat & Ketentuan
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-background">
			<Navbar />
			<main>
				<HeroSection />
				<ExploreSection />
				<FeaturesSection />
				<HowItWorksSection />
				<PricingSection />
				<TestimonialsSection />
				<CTASection />
			</main>
			<Footer />
		</div>
	);
}
