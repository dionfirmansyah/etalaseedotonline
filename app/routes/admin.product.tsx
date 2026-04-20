import { useState, useCallback, useMemo, useRef } from "react";
import { Link, useParams } from "react-router";
import { db } from "@/lib/db";
import { slug as toSlug, formatRupiah } from "@/lib/utils";
import { getSubdomain } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetFooter,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Plus,
	Search,
	Pencil,
	Trash2,
	PackageX,
	ImagePlus,
	X,
	AlertCircle,
	ArrowLeft,
	ToggleLeft,
	Eye,
	EyeOff,
	Package,
	Upload,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductImage = {
	id: string;
	url: string;
	alt?: string;
};

type Category = {
	id: string;
	name: string;
	slug: string;
};

type Product = {
	id: string;
	name: string;
	slug: string;
	price: number;
	stock?: number;
	descriptions?: string;
	isActive: boolean;
	created_at: string;
	deleted_at?: string;
	category?: Category;
	product_images?: ProductImage[];
};

type Tenant = {
	id: string;
	name: string;
	subdomain: string;
	subscription?: {
		plan?: { name: string; max_products: number };
	};
	categories?: Category[];
};

type FormValues = {
	name: string;
	slug: string;
	price: string;
	stock: string;
	descriptions: string;
	categoryId: string;
	isActive: boolean;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGES_BASIC = 1;
const MAX_IMAGES_PREMIUM = 3;

const EMPTY_FORM: FormValues = {
	name: "",
	slug: "",
	price: "",
	stock: "",
	descriptions: "",
	categoryId: "",
	isActive: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMaxImages(planName?: string) {
	return planName === "Premium" ? MAX_IMAGES_PREMIUM : MAX_IMAGES_BASIC;
}

// ─── Image Uploader ───────────────────────────────────────────────────────────

type ImageUploaderProps = {
	productId: string;
	images: ProductImage[];
	maxImages: number;
	tenantSubdomain: string;
};

function ImageUploader({
	productId,
	images,
	maxImages,
	tenantSubdomain,
}: ImageUploaderProps) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const canUpload = images.length < maxImages;

	const handleUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			// Validate type
			if (!file.type.startsWith("image/")) {
				toast.error("File harus berupa gambar");
				return;
			}

			// Validate size (max 2MB)
			if (file.size > 2 * 1024 * 1024) {
				toast.error("Ukuran gambar maksimal 2MB");
				return;
			}

			setUploading(true);
			try {
				// Unique path per tenant + product + timestamp
				const ext = file.name.split(".").pop();
				const path = `${tenantSubdomain}/products/${productId}/${Date.now()}.${ext}`;

				const { data } = await db.storage.uploadFile(path, file, {
					contentType: file.type,
				});

				// Create product_images record and link to product
				const imageId = db.id();
				await db.transact([
					db.tx.product_images[imageId].update({
						url: `https://storage.instantdb.com/${path}`,
						alt: file.name,
					}),
					db.tx.product_images[imageId].link({ product: productId }),
				]);

				toast.success("Foto berhasil diupload");
			} catch (err) {
				console.error(err);
				toast.error("Gagal upload foto");
			} finally {
				setUploading(false);
				// Reset input so same file can be re-selected
				if (fileRef.current) fileRef.current.value = "";
			}
		},
		[productId, tenantSubdomain],
	);

	const handleDelete = useCallback(async (image: ProductImage) => {
		setDeletingId(image.id);
		try {
			// Delete from storage + delete record (cascade unlinks automatically)
			const pathFromUrl = image.url.split("https://storage.instantdb.com/")[1];
			await Promise.all([
				db.storage.delete(pathFromUrl),
				db.transact(db.tx.product_images[image.id].delete()),
			]);
			toast.success("Foto dihapus");
		} catch (err) {
			console.error(err);
			toast.error("Gagal menghapus foto");
		} finally {
			setDeletingId(null);
		}
	}, []);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-sm font-medium">
					Foto Produk{" "}
					<span className="text-muted-foreground font-normal text-xs">
						({images.length}/{maxImages})
					</span>
				</Label>
				{maxImages === MAX_IMAGES_BASIC && (
					<Badge variant="secondary" className="text-[10px]">
						Upgrade ke Premium untuk 3 foto
					</Badge>
				)}
			</div>

			<div className="flex gap-2 flex-wrap">
				{/* Existing images */}
				{images.map((img) => (
					<div
						key={img.id}
						className="relative w-20 h-20 rounded-lg border border-border overflow-hidden group"
					>
						<img
							src={img.url}
							alt={img.alt ?? "foto produk"}
							className="w-full h-full object-cover"
						/>
						<button
							type="button"
							onClick={() => handleDelete(img)}
							disabled={deletingId === img.id}
							className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
						>
							{deletingId === img.id ? (
								<Spinner className="size-4 text-white" />
							) : (
								<X className="w-4 h-4 text-white" />
							)}
						</button>
					</div>
				))}

				{/* Upload slot */}
				{canUpload && (
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						disabled={uploading}
						className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1 bg-muted/30"
					>
						{uploading ? (
							<Spinner className="size-4 text-primary" />
						) : (
							<>
								<ImagePlus className="w-5 h-5 text-muted-foreground" />
								<span className="text-[10px] text-muted-foreground">
									Upload
								</span>
							</>
						)}
					</button>
				)}
			</div>

			<input
				ref={fileRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleUpload}
			/>
		</div>
	);
}

// ─── Product Form Sheet ───────────────────────────────────────────────────────

type ProductFormSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	product: Product | null; // null = create mode
	categories: Category[];
	tenant: Tenant;
	tenantSubdomain: string;
};

function ProductFormSheet({
	open,
	onOpenChange,
	product,
	categories,
	tenant,
	tenantSubdomain,
}: ProductFormSheetProps) {
	const isEdit = !!product;
	const planName = tenant.subscription?.plan?.name;

	const [form, setForm] = useState<FormValues>(() =>
		product
			? {
					name: product.name,
					slug: product.slug,
					price: String(product.price),
					stock: product.stock != null ? String(product.stock) : "",
					descriptions: product.descriptions ?? "",
					categoryId: product.category?.id ?? "",
					isActive: product.isActive,
				}
			: EMPTY_FORM,
	);

	// Reset form when product changes (open different product)
	const prevProductId = useRef<string | null>(null);
	if (product?.id !== prevProductId.current) {
		prevProductId.current = product?.id ?? null;
		if (open) {
			const next = product
				? {
						name: product.name,
						slug: product.slug,
						price: String(product.price),
						stock: product.stock != null ? String(product.stock) : "",
						descriptions: product.descriptions ?? "",
						categoryId: product.category?.id ?? "",
						isActive: product.isActive,
					}
				: EMPTY_FORM;
			// Only update if actually different to avoid loop
			if (JSON.stringify(next) !== JSON.stringify(form)) {
				// biome-ignore lint/suspicious/noAssignInExpressions
				Promise.resolve().then(() => setForm(next));
			}
		}
	}

	const [errors, setErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const handleNameChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const name = e.target.value;
			setForm((prev) => ({
				...prev,
				name,
				// Only auto-generate slug in create mode
				...(!isEdit && { slug: toSlug(name) }),
			}));
			setErrors((prev) => ({ ...prev, name: undefined }));
		},
		[isEdit],
	);

	const setField = useCallback(
		<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
			setForm((prev) => ({ ...prev, [key]: value }));
			setErrors((prev) => ({ ...prev, [key]: undefined }));
		},
		[],
	);

	const validate = useCallback((): boolean => {
		const e: FormErrors = {};
		if (!form.name.trim()) e.name = "Nama produk wajib diisi.";
		if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
			e.price = "Harga harus berupa angka positif.";
		if (form.stock && (isNaN(Number(form.stock)) || Number(form.stock) < 0))
			e.stock = "Stok harus berupa angka positif.";
		if (!form.categoryId) e.categoryId = "Kategori wajib dipilih.";
		setErrors(e);
		return Object.keys(e).length === 0;
	}, [form]);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!validate()) return;

			setIsSubmitting(true);
			setSubmitError(null);

			try {
				const payload = {
					name: form.name.trim(),
					slug: form.slug || toSlug(form.name.trim()),
					price: Number(form.price),
					stock: form.stock ? Number(form.stock) : undefined,
					descriptions: form.descriptions.trim() || undefined,
					isActive: form.isActive,
					...(!isEdit && { created_at: new Date() }),
				};

				if (isEdit) {
					await db.transact([
						db.tx.products[product!.id].update(payload),
						db.tx.products[product!.id].link({ category: form.categoryId }),
					]);
					toast.success("Produk berhasil diperbarui");
				} else {
					const productId = db.id();
					await db.transact([
						db.tx.products[productId].update(payload),
						db.tx.products[productId].link({
							tenant: tenant.id,
							category: form.categoryId,
						}),
					]);
					toast.success("Produk berhasil ditambahkan");
				}

				onOpenChange(false);
			} catch (err: unknown) {
				console.error(err);
				setSubmitError(
					err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi.",
				);
			} finally {
				setIsSubmitting(false);
			}
		},
		[form, validate, isEdit, product, tenant.id, onOpenChange],
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-lg overflow-y-auto px-4"
			>
				<SheetHeader className="border-b border-primary/30 pb-3">
					<SheetTitle className="text-primary">
						{isEdit ? "Edit Produk" : "Tambah Produk"}
					</SheetTitle>
					<SheetDescription>
						{isEdit
							? "Perbarui informasi produk kamu"
							: "Isi detail produk baru"}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="py-4 space-y-5" noValidate>
					{submitError && (
						<Alert variant="destructive">
							<AlertCircle className="w-4 h-4" />
							<AlertDescription>{submitError}</AlertDescription>
						</Alert>
					)}

					{/* Name */}
					<div className="space-y-2">
						<Label htmlFor="prod-name">
							Nama Produk <span className="text-destructive">*</span>
						</Label>
						<Input
							id="prod-name"
							placeholder="contoh: Rendang Sapi Premium"
							value={form.name}
							onChange={handleNameChange}
							maxLength={100}
							className={
								errors.name
									? "border-destructive focus-visible:ring-destructive"
									: "border-border focus-visible:ring-primary"
							}
						/>
						{errors.name && (
							<p className="text-xs text-destructive flex items-center gap-1">
								<AlertCircle className="w-3 h-3 shrink-0" />
								{errors.name}
							</p>
						)}
					</div>

					{/* Slug — editable in edit mode */}
					<div className="space-y-2">
						<Label htmlFor="prod-slug">
							Slug URL{" "}
							<span className="text-muted-foreground text-xs font-normal">
								(auto-generate)
							</span>
						</Label>
						<Input
							id="prod-slug"
							placeholder="nama-produk"
							value={form.slug}
							onChange={(e) =>
								setField(
									"slug",
									e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
								)
							}
							maxLength={100}
							className="border-border focus-visible:ring-primary font-mono text-sm"
						/>
						<p className="text-[10px] text-muted-foreground">
							Digunakan sebagai URL produk. Contoh:{" "}
							<span className="text-foreground">
								{tenantSubdomain}.etalasee.online/product/
								{form.slug || "nama-produk"}
							</span>
						</p>
					</div>

					{/* Price + Stock */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="prod-price">
								Harga (Rp) <span className="text-destructive">*</span>
							</Label>
							<Input
								id="prod-price"
								type="number"
								inputMode="numeric"
								placeholder="50000"
								value={form.price}
								onChange={(e) => setField("price", e.target.value)}
								min={0}
								className={
									errors.price
										? "border-destructive focus-visible:ring-destructive"
										: "border-border focus-visible:ring-primary"
								}
							/>
							{errors.price && (
								<p className="text-xs text-destructive flex items-center gap-1">
									<AlertCircle className="w-3 h-3 shrink-0" />
									{errors.price}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="prod-stock">
								Stok{" "}
								<span className="text-muted-foreground text-xs font-normal">
									(opsional)
								</span>
							</Label>
							<Input
								id="prod-stock"
								type="number"
								inputMode="numeric"
								placeholder="100"
								value={form.stock}
								onChange={(e) => setField("stock", e.target.value)}
								min={0}
								className={
									errors.stock
										? "border-destructive focus-visible:ring-destructive"
										: "border-border focus-visible:ring-primary"
								}
							/>
							{errors.stock && (
								<p className="text-xs text-destructive flex items-center gap-1">
									<AlertCircle className="w-3 h-3 shrink-0" />
									{errors.stock}
								</p>
							)}
						</div>
					</div>

					{/* Category */}
					<div className="space-y-2">
						<Label htmlFor="prod-category">
							Kategori <span className="text-destructive">*</span>
						</Label>
						<Select
							value={form.categoryId}
							onValueChange={(v) => setField("categoryId", v)}
						>
							<SelectTrigger
								id="prod-category"
								className={
									errors.categoryId
										? "border-destructive focus:ring-destructive"
										: "border-border focus:ring-primary"
								}
							>
								<SelectValue placeholder="Pilih kategori..." />
							</SelectTrigger>
							<SelectContent>
								{categories.length === 0 ? (
									<div className="px-3 py-4 text-xs text-muted-foreground text-center">
										Belum ada kategori tersedia
									</div>
								) : (
									categories.map((cat) => (
										<SelectItem key={cat.id} value={cat.id}>
											{cat.name}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
						{errors.categoryId && (
							<p className="text-xs text-destructive flex items-center gap-1">
								<AlertCircle className="w-3 h-3 shrink-0" />
								{errors.categoryId}
							</p>
						)}
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="prod-desc">
							Deskripsi{" "}
							<span className="text-muted-foreground text-xs font-normal">
								(opsional)
							</span>
						</Label>
						<Textarea
							id="prod-desc"
							placeholder="Ceritakan detail produk kamu..."
							value={form.descriptions}
							onChange={(e) => setField("descriptions", e.target.value)}
							rows={4}
							maxLength={1000}
							className="border-border focus-visible:ring-primary resize-none"
						/>
						<p className="text-xs text-muted-foreground text-right">
							{form.descriptions.length}/1000
						</p>
					</div>

					{/* Active toggle */}
					<div className="flex items-center justify-between rounded-lg border border-border p-3">
						<div className="space-y-0.5">
							<Label className="text-sm">Tampilkan Produk</Label>
							<p className="text-xs text-muted-foreground">
								Produk akan terlihat oleh pelanggan
							</p>
						</div>
						<Switch
							checked={form.isActive}
							onCheckedChange={(v) => setField("isActive", v)}
						/>
					</div>

					{/* Image uploader — only shown in edit mode (need product ID) */}
					{isEdit && product && (
						<>
							<Separator />
							<ImageUploader
								productId={product.id}
								images={product.product_images ?? []}
								maxImages={getMaxImages(planName)}
								tenantSubdomain={tenantSubdomain}
							/>
						</>
					)}

					{!isEdit && (
						<p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 flex items-start gap-2">
							<Upload className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
							Setelah produk dibuat, kamu bisa menambahkan foto melalui tombol
							edit.
						</p>
					)}

					<SheetFooter className="flex flex-row gap-2 sticky bottom-0 bg-background pt-3 pb-1">
						<Button
							type="button"
							variant="outline"
							className="flex-1"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Batal
						</Button>
						<Button type="submit" className="flex-1" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Spinner className="size-4 mr-2 text-primary-foreground" />
									<span className="text-primary-foreground">Menyimpan...</span>
								</>
							) : (
								<span className="text-primary-foreground">
									{isEdit ? "Simpan Perubahan" : "Tambah Produk"}
								</span>
							)}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}

// ─── Product Row ──────────────────────────────────────────────────────────────

type ProductRowProps = {
	product: Product;
	onEdit: (product: Product) => void;
	onDelete: (product: Product) => void;
	onToggleActive: (product: Product) => void;
	onUpdateStock: (product: Product) => void;
};

function ProductRow({
	product,
	onEdit,
	onDelete,
	onToggleActive,
	onUpdateStock,
}: ProductRowProps) {
	const firstImage = product.product_images?.[0];

	return (
		<div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors bg-card">
			{/* Image */}
			<div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
				{firstImage ? (
					<img
						src={firstImage.url}
						alt={firstImage.alt ?? product.name}
						className="w-full h-full object-cover"
					/>
				) : (
					<Package className="w-6 h-6 text-muted-foreground/40" />
				)}
			</div>

			{/* Info */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<p className="text-sm font-medium text-foreground truncate">
						{product.name}
					</p>
					{product.category && (
						<Badge
							variant="secondary"
							className="text-[10px] px-1.5 py-0 h-4 shrink-0"
						>
							{product.category.name}
						</Badge>
					)}
					{!product.isActive && (
						<Badge
							variant="outline"
							className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground shrink-0"
						>
							Nonaktif
						</Badge>
					)}
				</div>
				<p className="text-sm font-semibold text-primary mt-0.5">
					{formatRupiah(product.price)}
				</p>
				<p className="text-xs text-muted-foreground mt-0.5">
					Stok:{" "}
					<button
						type="button"
						onClick={() => onUpdateStock(product)}
						className="underline underline-offset-2 hover:text-foreground transition-colors"
					>
						{product.stock != null ? product.stock : "—"}
					</button>
					{" · "}
					{product.product_images?.length ?? 0} foto
				</p>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-1 shrink-0">
				{/* Toggle active */}
				<button
					type="button"
					onClick={() => onToggleActive(product)}
					title={product.isActive ? "Nonaktifkan" : "Aktifkan"}
					className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
				>
					{product.isActive ? (
						<Eye className="w-4 h-4 text-primary" />
					) : (
						<EyeOff className="w-4 h-4 text-muted-foreground" />
					)}
				</button>

				{/* Edit */}
				<button
					type="button"
					onClick={() => onEdit(product)}
					title="Edit produk"
					className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
				>
					<Pencil className="w-4 h-4 text-primary" />
				</button>

				{/* Delete */}
				<button
					type="button"
					onClick={() => onDelete(product)}
					title="Hapus produk"
					className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors"
				>
					<Trash2 className="w-4 h-4 text-destructive" />
				</button>
			</div>
		</div>
	);
}

// ─── Stock Edit Dialog ────────────────────────────────────────────────────────

function StockDialog({
	product,
	open,
	onOpenChange,
}: {
	product: Product | null;
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const [value, setValue] = useState("");
	const [saving, setSaving] = useState(false);

	// Sync value when product changes
	if (open && product && value === "" && product.stock != null) {
		setValue(String(product.stock));
	}

	const handleSave = useCallback(async () => {
		if (!product) return;
		const num = Number(value);
		if (isNaN(num) || num < 0) {
			toast.error("Stok harus berupa angka positif");
			return;
		}
		setSaving(true);
		try {
			await db.transact(db.tx.products[product.id].update({ stock: num }));
			toast.success(`Stok "${product.name}" diperbarui`);
			onOpenChange(false);
			setValue("");
		} catch (err) {
			console.error(err);
			toast.error("Gagal memperbarui stok");
		} finally {
			setSaving(false);
		}
	}, [product, value, onOpenChange]);

	return (
		<AlertDialog
			open={open}
			onOpenChange={(v) => {
				onOpenChange(v);
				if (!v) setValue("");
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Update Stok</AlertDialogTitle>
					<AlertDialogDescription>
						Perbarui jumlah stok untuk{" "}
						<span className="font-medium text-foreground">{product?.name}</span>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="py-2">
					<Input
						type="number"
						inputMode="numeric"
						min={0}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						placeholder="Jumlah stok"
						className="border-border focus-visible:ring-primary"
						autoFocus
						onKeyDown={(e) => e.key === "Enter" && handleSave()}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={saving}>Batal</AlertDialogCancel>
					<AlertDialogAction onClick={handleSave} disabled={saving}>
						{saving ? (
							<Spinner className="size-4 text-primary-foreground" />
						) : (
							"Simpan"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminProductPage() {
	const { user, isLoading: authLoading } = db.useAuth();

	// Detect subdomain from hostname
	const subdomain =
		typeof window !== "undefined" ? window.location.hostname.split(".")[0] : "";

	// Realtime data
	const { data, isLoading } = db.useQuery(
		user
			? {
					tenants: {
						$: { where: { subdomain } },
						subscription: {
							plan: { $: { fields: ["name", "max_products"] } },
						},
						products: {
							$: {
								where: { deleted_at: { $isNull: true } },
								order: { serverCreatedAt: "desc" },
							},
							category: {},
							product_images: {},
						},
						categories: {},
					},
				}
			: null,
	);

	const tenant = data?.tenants?.[0] as Tenant | undefined;
	const allProducts = (tenant?.products ?? []) as Product[];
	const categories = (tenant?.categories ?? []) as Category[];
	const planName = tenant?.subscription?.plan?.name;
	const maxProducts = tenant?.subscription?.plan?.max_products ?? 20;

	// Search
	const [search, setSearch] = useState("");
	const filteredProducts = useMemo(() => {
		const q = search.toLowerCase().trim();
		if (!q) return allProducts;
		return allProducts.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				p.category?.name.toLowerCase().includes(q),
		);
	}, [allProducts, search]);

	// Sheet state
	const [sheetOpen, setSheetOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);

	const handleOpenCreate = useCallback(() => {
		setEditingProduct(null);
		setSheetOpen(true);
	}, []);

	const handleOpenEdit = useCallback((product: Product) => {
		setEditingProduct(product);
		setSheetOpen(true);
	}, []);

	// Delete
	const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleConfirmDelete = useCallback(async () => {
		if (!deletingProduct) return;
		setIsDeleting(true);
		try {
			await db.transact(
				db.tx.products[deletingProduct.id].update({
					deleted_at: new Date(),
					isActive: false,
				}),
			);
			toast.success(`"${deletingProduct.name}" dihapus`);
		} catch (err) {
			console.error(err);
			toast.error("Gagal menghapus produk");
		} finally {
			setIsDeleting(false);
			setDeletingProduct(null);
		}
	}, [deletingProduct]);

	// Toggle active
	const handleToggleActive = useCallback(async (product: Product) => {
		try {
			await db.transact(
				db.tx.products[product.id].update({ isActive: !product.isActive }),
			);
			toast.success(
				product.isActive
					? `"${product.name}" disembunyikan`
					: `"${product.name}" ditampilkan`,
			);
		} catch (err) {
			console.error(err);
			toast.error("Gagal mengubah status produk");
		}
	}, []);

	// Stock dialog
	const [stockProduct, setStockProduct] = useState<Product | null>(null);
	const [stockDialogOpen, setStockDialogOpen] = useState(false);

	const handleUpdateStock = useCallback((product: Product) => {
		setStockProduct(product);
		setStockDialogOpen(true);
	}, []);

	const atLimit = allProducts.length >= maxProducts;

	// Auth / loading guard
	if (authLoading || isLoading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Spinner className="size-8 text-primary" />
			</div>
		);
	}

	if (!user || !tenant) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center px-4">
				<div className="text-center space-y-3">
					<AlertCircle className="w-8 h-8 text-destructive mx-auto" />
					<p className="text-sm text-muted-foreground">
						Tidak bisa memuat data toko.
					</p>
					<Button variant="outline" size="sm" asChild>
						<Link to="/admin/dashboard">
							<ArrowLeft className="w-4 h-4 mr-1.5" />
							Kembali ke Dashboard
						</Link>
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
				<div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" asChild>
							<Link to="/admin/dashboard">
								<ArrowLeft className="w-4 h-4 text-primary" />
							</Link>
						</Button>
						<div>
							<h1 className="text-sm font-semibold text-foreground leading-tight">
								Kelola Produk
							</h1>
							<p className="text-[10px] text-muted-foreground leading-tight">
								{tenant.name}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Product count + plan badge */}
						<Badge
							variant={atLimit ? "destructive" : "secondary"}
							className="text-xs hidden sm:flex"
						>
							{allProducts.length}/{maxProducts} produk
						</Badge>
						<Badge
							variant={planName === "Premium" ? "default" : "outline"}
							className="text-xs hidden sm:flex"
						>
							{planName ?? "Basic"}
						</Badge>

						<Button
							size="sm"
							onClick={handleOpenCreate}
							disabled={atLimit}
							title={atLimit ? "Batas produk tercapai" : "Tambah produk"}
						>
							<Plus className="w-4 h-4 mr-1 text-primary-foreground" />
							<span className="text-primary-foreground">Tambah</span>
						</Button>
					</div>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
				{/* Limit warning */}
				{atLimit && (
					<Alert variant="destructive">
						<AlertCircle className="w-4 h-4" />
						<AlertDescription>
							Kamu telah mencapai batas{" "}
							<span className="font-medium">{maxProducts} produk</span> untuk
							plan {planName ?? "Basic"}.{" "}
							{planName !== "Premium" && (
								<Link
									to="/dashboard"
									className="underline underline-offset-2 font-medium"
								>
									Upgrade ke Premium
								</Link>
							)}{" "}
							untuk menambah lebih banyak produk.
						</AlertDescription>
					</Alert>
				)}

				{/* Search bar */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nama produk atau kategori..."
						className="pl-9 border-border focus-visible:ring-primary"
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>

				{/* Results summary */}
				<div className="flex items-center justify-between">
					<p className="text-xs text-muted-foreground">
						{search
							? `${filteredProducts.length} dari ${allProducts.length} produk`
							: `${allProducts.length} produk`}
					</p>
					<div className="flex items-center gap-1 text-xs text-muted-foreground sm:hidden">
						<span>
							{allProducts.length}/{maxProducts}
						</span>
						<span>·</span>
						<span>{planName ?? "Basic"}</span>
					</div>
				</div>

				{/* Product list */}
				{filteredProducts.length === 0 ? (
					<Card className="border-dashed border-border">
						<CardContent className="py-16 flex flex-col items-center gap-3 text-center">
							<div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
								{search ? (
									<Search className="w-6 h-6 text-muted-foreground" />
								) : (
									<PackageX className="w-6 h-6 text-muted-foreground" />
								)}
							</div>
							<div className="space-y-1">
								<p className="text-sm font-medium text-foreground">
									{search ? "Produk tidak ditemukan" : "Belum ada produk"}
								</p>
								<p className="text-xs text-muted-foreground max-w-xs">
									{search
										? "Coba kata kunci lain"
										: "Tambah produk pertamamu untuk mulai berjualan"}
								</p>
							</div>
							{!search && (
								<Button size="sm" onClick={handleOpenCreate} disabled={atLimit}>
									<Plus className="w-4 h-4 mr-1 text-primary-foreground" />
									<span className="text-primary-foreground">Tambah Produk</span>
								</Button>
							)}
						</CardContent>
					</Card>
				) : (
					<div className="space-y-2">
						{filteredProducts.map((product) => (
							<ProductRow
								key={product.id}
								product={product}
								onEdit={handleOpenEdit}
								onDelete={setDeletingProduct}
								onToggleActive={handleToggleActive}
								onUpdateStock={handleUpdateStock}
							/>
						))}
					</div>
				)}
			</main>

			{/* Product form sheet */}
			{tenant && (
				<ProductFormSheet
					open={sheetOpen}
					onOpenChange={setSheetOpen}
					product={editingProduct}
					categories={categories}
					tenant={tenant}
					tenantSubdomain={subdomain}
				/>
			)}

			{/* Delete confirm */}
			<AlertDialog
				open={!!deletingProduct}
				onOpenChange={(v) => !v && setDeletingProduct(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus produk?</AlertDialogTitle>
						<AlertDialogDescription>
							Produk{" "}
							<span className="font-medium text-foreground">
								"{deletingProduct?.name}"
							</span>{" "}
							akan dihapus dan tidak bisa dilihat oleh pelanggan. Tindakan ini
							bisa dibatalkan oleh admin.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							disabled={isDeleting}
							className="bg-destructive hover:bg-destructive/90"
						>
							{isDeleting ? <Spinner className="size-4 text-white" /> : "Hapus"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Stock dialog */}
			<StockDialog
				product={stockProduct}
				open={stockDialogOpen}
				onOpenChange={setStockDialogOpen}
			/>
		</div>
	);
}
