/** biome-ignore-all lint/correctness/useUniqueElementIds: false positive */
/** biome-ignore-all lint/a11y/useSemanticElements: <explanation> */
/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQueryStates, parseAsString, parseAsInteger } from "nuqs";
import { Search, ListFilter, PackageX, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { User } from "@instantdb/react";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { db, type Category, type Product } from "@/lib/db";
import { formatRupiah } from "@/lib/utils";
import { Spinner } from "../ui/spinner";

type ProductListProps = {
	products: Product[];
	categories: Category[];
};

// Constants
const DEFAULT_FILTERS = {
	q: "",
	sortBy: "terbaru",
	minPrice: 0,
	maxPrice: 1000000,
	category: "Semua Kategori",
} as const;

const SORT_OPTIONS = [
	{ value: "terbaru", label: "Terbaru" },
	{ value: "terlama", label: "Terlama" },
	{ value: "termurah", label: "Harga Termurah" },
	{ value: "termahal", label: "Harga Termahal" },
] as const;

// Hook for prefetching
const usePrefetch = () => {
	const navigate = useNavigate();

	const prefetch = useCallback((slug: string) => {
		// Create a hidden link to trigger React Router's prefetch
		const link = document.createElement("link");
		link.rel = "prefetch";
		link.href = `/product/${slug}`;
		document.head.appendChild(link);

		// Cleanup after a delay
		setTimeout(() => {
			document.head.removeChild(link);
		}, 3000);
	}, []);

	const navigateToProduct = useCallback(
		(slug: string) => {
			navigate(`/product/${slug}`);
		},
		[navigate],
	);

	return { prefetch, navigateToProduct };
};

// Hook for filtering and sorting products
const useProductFilters = (
	products: Product[],
	params: {
		q: string;
		sortBy: string;
		minPrice: number;
		maxPrice: number;
		category: string;
	},
) => {
	return useMemo(() => {
		let filtered = products.filter((product) =>
			product.name.toLowerCase().includes(params.q.toLowerCase()),
		);

		// Filter by category
		if (params.category !== "Semua Kategori") {
			filtered = filtered.filter(
				(product) => product.category?.name === params.category,
			);
		}

		// Filter by price range
		filtered = filtered.filter(
			(product) =>
				product.price >= params.minPrice && product.price <= params.maxPrice,
		);

		// Sort products
		const sortedProducts = [...filtered];
		switch (params.sortBy) {
			case "terbaru":
				sortedProducts.sort(
					(a, b) =>
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
				);
				break;
			case "terlama":
				sortedProducts.sort(
					(a, b) =>
						new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
				);
				break;
			case "termurah":
				sortedProducts.sort((a, b) => a.price - b.price);
				break;
			case "termahal":
				sortedProducts.sort((a, b) => b.price - a.price);
				break;
		}

		return sortedProducts;
	}, [products, params]);
};

export default function ProductList({
	products,
	categories,
}: ProductListProps) {
	const { prefetch, navigateToProduct } = usePrefetch();
	const [clickedProductId, setClickedProductId] = useState<string | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	const [params, setParams] = useQueryStates(
		{
			q: parseAsString.withDefault(DEFAULT_FILTERS.q),
			sortBy: parseAsString.withDefault(DEFAULT_FILTERS.sortBy),
			minPrice: parseAsInteger.withDefault(DEFAULT_FILTERS.minPrice),
			maxPrice: parseAsInteger.withDefault(DEFAULT_FILTERS.maxPrice),
			category: parseAsString.withDefault(DEFAULT_FILTERS.category),
		},
		{
			history: "replace",
			shallow: true,
			scroll: false,
		},
	);

	const [search, setSearch] = useState(params.q);
	const [tempFilters, setTempFilters] = useState({
		sortBy: params.sortBy,
		priceRange: [params.minPrice, params.maxPrice] as [number, number],
		category: params.category,
	});

	// Sync search input with URL
	useEffect(() => {
		setSearch(params.q);
	}, [params.q]);

	// Reset temp filters when sheet opens
	useEffect(() => {
		if (isSheetOpen) {
			setTempFilters({
				sortBy: params.sortBy,
				category: params.category,
				priceRange: [params.minPrice, params.maxPrice],
			});
		}
	}, [
		isSheetOpen,
		params.sortBy,
		params.category,
		params.minPrice,
		params.maxPrice,
	]);

	// Use custom hook for filtering
	const filteredProducts = useProductFilters(products, params);

	// Check if filters are active
	const hasActiveFilters = useMemo(
		() =>
			params.sortBy !== DEFAULT_FILTERS.sortBy ||
			params.category !== DEFAULT_FILTERS.category ||
			params.minPrice !== DEFAULT_FILTERS.minPrice ||
			params.maxPrice !== DEFAULT_FILTERS.maxPrice,
		[params],
	);

	// Handlers
	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			setSearch(value);
			setParams({ q: value || null });
		},
		[setParams],
	);

	const handleCardClick = useCallback(
		(productId: string, slug: string) => {
			setClickedProductId(productId);
			navigateToProduct(slug);
		},
		[navigateToProduct],
	);

	const handleProductHover = useCallback(
		(slug: string) => {
			prefetch(slug);
		},
		[prefetch],
	);

	const handleResetFilters = useCallback(() => {
		setTempFilters({
			sortBy: DEFAULT_FILTERS.sortBy,
			priceRange: [DEFAULT_FILTERS.minPrice, DEFAULT_FILTERS.maxPrice],
			category: DEFAULT_FILTERS.category,
		});
	}, []);

	const handleApplyFilters = useCallback(() => {
		setParams({
			sortBy:
				tempFilters.sortBy === DEFAULT_FILTERS.sortBy
					? null
					: tempFilters.sortBy,
			minPrice:
				tempFilters.priceRange[0] === DEFAULT_FILTERS.minPrice
					? null
					: tempFilters.priceRange[0],
			maxPrice:
				tempFilters.priceRange[1] === DEFAULT_FILTERS.maxPrice
					? null
					: tempFilters.priceRange[1],
			category:
				tempFilters.category === DEFAULT_FILTERS.category
					? null
					: tempFilters.category,
		});
		setIsSheetOpen(false);
	}, [tempFilters, setParams]);

	const removeFilter = useCallback(
		(filterType: "sort" | "category" | "price") => {
			switch (filterType) {
				case "sort":
					setParams({ sortBy: null });
					break;
				case "category":
					setParams({ category: null });
					break;
				case "price":
					setParams({ minPrice: null, maxPrice: null });
					break;
			}
		},
		[setParams],
	);

	return (
		<>
			{/* Search Bar */}
			<SearchBar
				search={search}
				onChange={handleSearchChange}
				isSheetOpen={isSheetOpen}
				onSheetOpenChange={setIsSheetOpen}
			/>

			{/* Filter Sheet */}
			<FilterSheet
				isOpen={isSheetOpen}
				onOpenChange={setIsSheetOpen}
				tempFilters={tempFilters}
				onTempFiltersChange={setTempFilters}
				categories={categories}
				onReset={handleResetFilters}
				onApply={handleApplyFilters}
			/>

			{/* Active Filters */}
			{hasActiveFilters && (
				<ActiveFilters params={params} onRemoveFilter={removeFilter} />
			)}

			{/* Empty State */}
			{filteredProducts.length === 0 && <EmptyState />}

			{/* Product List */}
			<div className="space-y-3">
				{filteredProducts.map((product) => (
					<ProductItem
						key={product.id}
						product={product}
						isLoading={clickedProductId === product.id}
						onClick={handleCardClick}
						onHover={handleProductHover}
					/>
				))}
			</div>
		</>
	);
}

// Sub-components
const SearchBar = ({
	search,
	onChange,
	isSheetOpen,
	onSheetOpenChange,
}: {
	search: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	isSheetOpen: boolean;
	onSheetOpenChange: (open: boolean) => void;
}) => (
	<div className="flex items-center gap-2">
		<div className="relative flex-1">
			<Search
				size={20}
				className="text-primary absolute top-1/2 left-3 -translate-y-1/2 transform"
			/>
			<Input
				type="text"
				placeholder="Search products"
				value={search}
				onChange={onChange}
				className="border-primary text-primary placeholder-primary w-full py-3 pr-4 pl-10"
			/>
		</div>
		<Sheet open={isSheetOpen} onOpenChange={onSheetOpenChange}>
			<SheetTrigger asChild>
				<Button variant="custom" size="icon" className="rounded-md">
					<ListFilter size={20} className="text-primary" />
				</Button>
			</SheetTrigger>
		</Sheet>
	</div>
);

const FilterSheet = ({
	isOpen,
	onOpenChange,
	tempFilters,
	onTempFiltersChange,
	categories,
	onReset,
	onApply,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	tempFilters: {
		sortBy: string;
		priceRange: [number, number];
		category: string;
	};
	onTempFiltersChange: React.Dispatch<
		React.SetStateAction<{
			sortBy: string;
			priceRange: [number, number];
			category: string;
		}>
	>;
	categories: Category[];
	onReset: () => void;
	onApply: () => void;
}) => (
	<Sheet open={isOpen} onOpenChange={onOpenChange}>
		<SheetContent
			side="bottom"
			className="h-[65vh] overflow-y-auto px-4 rounded-t-[25px]"
		>
			<SheetHeader className="px-0 border-b border-primary/50">
				<SheetTitle className="text-primary">Filter Produk</SheetTitle>
				<SheetDescription>
					Sesuaikan filter untuk menemukan produk yang Anda cari
				</SheetDescription>
			</SheetHeader>

			<div className="py-2 space-y-6">
				{/* Sort By */}
				<div className="space-y-3">
					<Label className="text-primary font-semibold text-base">
						Urutkan
					</Label>
					<RadioGroup
						value={tempFilters.sortBy}
						onValueChange={(value) =>
							onTempFiltersChange((prev) => ({ ...prev, sortBy: value }))
						}
					>
						{SORT_OPTIONS.map((option) => (
							<div key={option.value} className="flex items-center space-x-2">
								<RadioGroupItem value={option.value} id={option.value} />
								<Label htmlFor={option.value} className="cursor-pointer">
									{option.label}
								</Label>
							</div>
						))}
					</RadioGroup>
				</div>

				{/* Price Range */}
				<div className="space-y-3">
					<Label className="text-primary font-semibold text-base">
						Rentang Harga
					</Label>
					<div className="pt-2">
						<Slider
							min={0}
							max={1000000}
							step={10000}
							value={tempFilters.priceRange}
							onValueChange={(value) =>
								onTempFiltersChange((prev) => ({
									...prev,
									priceRange: value as [number, number],
								}))
							}
							className="w-full"
						/>
					</div>
					<div className="flex justify-between text-sm text-muted-foreground">
						<span>{formatRupiah(tempFilters.priceRange[0])}</span>
						<span>{formatRupiah(tempFilters.priceRange[1])}</span>
					</div>
				</div>

				{/* Category */}
				<div className="space-y-3">
					<Label className="text-primary font-semibold text-base">
						Kategori
					</Label>
					<RadioGroup
						value={tempFilters.category}
						onValueChange={(value) =>
							onTempFiltersChange((prev) => ({ ...prev, category: value }))
						}
					>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="Semua Kategori" id="semua" />
							<Label htmlFor="semua" className="cursor-pointer">
								Semua Kategori
							</Label>
						</div>
						{categories.map((category) => (
							<div key={category.id} className="flex items-center space-x-2">
								<RadioGroupItem value={category.name} id={category.id} />
								<Label htmlFor={category.id} className="cursor-pointer">
									{category.name}
								</Label>
							</div>
						))}
					</RadioGroup>
				</div>
			</div>

			<SheetFooter className="flex flex-row gap-2 sticky bottom-0 bg-background">
				<Button variant="outline" onClick={onReset} className="flex-1">
					Reset Filter
				</Button>
				<Button onClick={onApply} className="flex-1">
					<p className="text-accent">Terapkan Filter</p>
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
);

const ActiveFilters = ({
	params,
	onRemoveFilter,
}: {
	params: {
		sortBy: string;
		category: string;
		minPrice: number;
		maxPrice: number;
	};
	onRemoveFilter: (filterType: "sort" | "category" | "price") => void;
}) => {
	const getSortLabel = (sortBy: string) => {
		const option = SORT_OPTIONS.find((opt) => opt.value === sortBy);
		return option?.label || sortBy;
	};

	return (
		<div className="flex flex-wrap gap-2">
			{params.sortBy !== DEFAULT_FILTERS.sortBy && (
				<FilterBadge
					label={getSortLabel(params.sortBy)}
					onRemove={() => onRemoveFilter("sort")}
				/>
			)}
			{params.category !== DEFAULT_FILTERS.category && (
				<FilterBadge
					label={params.category}
					onRemove={() => onRemoveFilter("category")}
				/>
			)}
			{(params.minPrice !== DEFAULT_FILTERS.minPrice ||
				params.maxPrice !== DEFAULT_FILTERS.maxPrice) && (
				<FilterBadge
					label={`${formatRupiah(params.minPrice)} - ${formatRupiah(params.maxPrice)}`}
					onRemove={() => onRemoveFilter("price")}
				/>
			)}
		</div>
	);
};

const FilterBadge = ({
	label,
	onRemove,
}: {
	label: string;
	onRemove: () => void;
}) => (
	<div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
		<span>{label}</span>
		<X size={14} className="cursor-pointer" onClick={onRemove} />
	</div>
);

const EmptyState = () => (
	<div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
		<PackageX size={48} className="mb-4 text-gray-400" />
		<p className="text-lg font-medium">Produk tidak ditemukan</p>
		<p className="text-sm">Coba gunakan kata kunci lain atau ubah filter</p>
	</div>
);

const StockBadge = ({ stock }: { stock: number }) => {
	if (stock === undefined || stock === null || stock <= 0) {
		return (
			<Badge variant="default" className="text-xs">
				Stok Habis
			</Badge>
		);
	}

	if (stock <= 5) {
		return (
			<Badge variant="default" className="text-xs">
				Stok Sisa: {stock}
			</Badge>
		);
	}

	return <p className="text-xs text-primary underline">Stok: {stock}</p>;
};

const ProductItem = ({
	product,
	isLoading,
	onClick,
	onHover,
}: {
	product: Product;
	isLoading?: boolean;
	onClick: (productId: string, slug: string) => void;
	onHover: (slug: string) => void;
}) => {
	const handleMouseEnter = useCallback(() => {
		onHover(product.slug);
	}, [product.slug, onHover]);

	const handleClick = useCallback(() => {
		onClick(product.id, product.slug);
	}, [product.id, product.slug, onClick]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleClick();
			}
		},
		[handleClick],
	);

	return (
		<Item asChild variant="customOutline">
			<div
				onClick={handleClick}
				onMouseEnter={handleMouseEnter}
				onKeyDown={handleKeyDown}
				role="button"
				tabIndex={0}
			>
				{isLoading && (
					<div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-md flex items-center justify-center z-10">
						<Spinner className="text-primary size-6" />
					</div>
				)}

				<ItemMedia variant="image">
					<img
						src="https://picsum.photos/id/112/400/300"
						alt={product.name}
						width={100}
						height={100}
						className="rounded-lg object-cover"
						loading="lazy"
						decoding="async"
					/>
				</ItemMedia>

				<ItemContent className="flex-1 gap-1">
					<ItemTitle className="text-primary font-semibold">
						{product.name}
					</ItemTitle>
					<ItemDescription className="text-primary text-sm font-semibold line-clamp-1">
						{product.descriptions}
					</ItemDescription>
				</ItemContent>

				<ItemContent className="flex-none flex-col items-end gap-2">
					<StockBadge stock={product.stock!} />
					<p className="text-sm text-primary font-semibold">
						{formatRupiah(product.price)}
					</p>
				</ItemContent>
			</div>
		</Item>
	);
};
