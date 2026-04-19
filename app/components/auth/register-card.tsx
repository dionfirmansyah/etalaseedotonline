import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { GoogleLogin } from "@react-oauth/google";
import { useOAuthIDB } from "@/hooks/useOAuthIDB";
import { db, adminDB } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Store,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  AlertCircle,
  Shield,
  Phone,
  MapPin,
  Instagram,
  ArrowLeft,
  Lock,
  Crown,
} from "lucide-react";
import { id } from "@instantdb/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "auth" | "onboarding" | "tenantInfo";

type SubdomainStatus = "idle" | "checking" | "available" | "taken";

/** Data dikumpulkan di step 2 — belum disimpan ke DB */
type StoreFormValues = {
  storeName: string;
  subdomain: string;
  description: string;
};

/** Data dikumpulkan di step 3 */
type TenantInfoValues = {
  whatsapp: string;
  instagram: string;
  location: string;
};

type StoreFormErrors = Partial<Record<keyof StoreFormValues, string>>;
type TenantInfoErrors = Partial<Record<keyof TenantInfoValues, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const RESERVED_SUBDOMAINS = [
  "www", "api", "admin", "app", "mail", "help",
  "support", "etalasee", "dashboard", "static", "cdn",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validateSubdomain(value: string): string | null {
  if (!value) return "Subdomain wajib diisi.";
  if (RESERVED_SUBDOMAINS.includes(value)) return "Subdomain ini tidak tersedia.";
  if (!SUBDOMAIN_REGEX.test(value))
    return "Hanya huruf kecil, angka, dan tanda hubung. Min. 3 karakter.";
  return null;
}

function normalizeSubdomain(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Hook: cek jumlah toko milik user ────────────────────────────────────────────
//
// Logika bisnis:
//   - User tanpa subscription (free) → maksimal 1 toko
//   - User dengan subscription aktif → ikut batas max_products dari plan mereka
//
// Ini adalah CLIENT-SIDE guard (UX). Tetap pasang server-side guard di
// instant.perms.ts supaya tidak bisa di-bypass dari browser console.

type TenantLimitResult =
  | { status: "loading" }
  | { status: "allowed"; ownedCount: number }
  | { status: "blocked"; ownedCount: number; dashboardUrl: string };

function useTenantLimit(userId: string | undefined): TenantLimitResult {
  const { isLoading, data } = db.useQuery(
    userId
      ? {
          $users: {
            $: { where: { id: userId }, fields:["email"] },
            tenants:{ $:{fields: ["id", "subdomain"]}},
            subscriptions: {
              plan: { $: { fields: ["name"] } },
            },
          },
        }
      : null
  );

  if (!userId || isLoading || !data) return { status: "loading" };

  const tenants = data.$users[0].tenants ?? [];
  const ownedCount = tenants.length;

  // Ambil batas dari subscription aktif; default 1 untuk akun gratis
  const tenantWithSub = tenants.find((t: any) => t.subscription?.plan);
  const maxTenants: number =
    (tenantWithSub as any)?.subscription?.plan?.max_products ?? 1;

  if (ownedCount >= maxTenants) {
    const firstSubdomain = (tenants[0] as any)?.subdomain ?? "";
    return {
      status: "blocked",
      ownedCount,
      dashboardUrl: firstSubdomain
        ? `https://www.etalasee.online/dashboard`
        : "/login",
    };
  }

  return { status: "allowed", ownedCount };
}

// ─── Blocked Screen ──────────────────────────────────────────────────────────────────────────────────

function TenantLimitGate({
  ownedCount,
  dashboardUrl,
}: {
  ownedCount: number;
  dashboardUrl: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-destructive" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-foreground">
          Batas toko gratis tercapai
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kamu sudah memiliki{" "}
          <span className="font-medium text-foreground">{ownedCount} toko</span>.
          Akun gratis hanya dapat memiliki 1 toko. Upgrade ke plan berbayar
          untuk membuat lebih banyak toko.
        </p>
      </div>

      <div className="w-full space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            window.location.href = dashboardUrl;
          }}
        >
          <Store className="w-4 h-4 mr-2 text-primary-foreground" />
          <span className="text-primary-foreground">Kembali ke Dashboard</span>
        </Button>

        <Button variant="outline" size="lg" className="w-full" asChild>
          <Link to="/pricing">
            <Crown className="w-4 h-4 mr-2" />
            Lihat Paket Upgrade
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Dengan upgrade, kamu bisa membuat beberapa toko dalam satu akun.
      </p>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "auth", label: "Masuk" },
    { key: "onboarding", label: "Buat Toko" },
    { key: "tenantInfo", label: "Info Toko" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {steps.map((step, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  isDone || isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-px transition-colors ${
                  isDone ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Auth ─────────────────────────────────────────────────────────────

function AuthStep() {
  const { nonce, isLoading, handleGoogleSuccess, handleGoogleError } =
    useOAuthIDB();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          Mulai perjalananmu
        </h2>
        <p className="text-sm text-muted-foreground">
          Masuk dengan Google untuk melanjutkan pendaftaran toko
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <span className="text-primary font-medium text-center">
          Login aman dengan enkripsi end-to-end
        </span>
      </div>

      <div className="flex justify-center">
        <div
          className={`transition-opacity duration-200 ${
            isLoading ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <GoogleLogin
            nonce={nonce}
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            size="large"
            width={280}
            logo_alignment="left"
            theme="outline"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Memproses login, mohon tunggu...</span>
        </div>
      )}

      <Separator />

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Dengan mendaftar, kamu menyetujui{" "}
        <Link
          to="/terms"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          Syarat & Ketentuan
        </Link>{" "}
        dan{" "}
        <Link
          to="/privacy"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          Kebijakan Privasi
        </Link>{" "}
        kami.
      </p>

      <p className="text-center text-xs text-muted-foreground">
        Sudah punya toko?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}

// ─── Step 2: Detail Toko (HANYA kumpulkan data, tidak transact) ───────────────

interface OnboardingStepProps {
  initialValues: StoreFormValues;
  onNext: (values: StoreFormValues) => void;
}

function OnboardingStep({ initialValues, onNext }: OnboardingStepProps) {
  const [form, setForm] = useState<StoreFormValues>(initialValues);
  const [subdomainInput, setSubdomainInput] = useState(initialValues.subdomain);
  const [errors, setErrors] = useState<StoreFormErrors>({});
  const [subdomainStatus, setSubdomainStatus] = useState<SubdomainStatus>(
    initialValues.subdomain ? "available" : "idle"
  );

  const handleStoreNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      // Hanya auto-generate subdomain jika user belum edit subdomain secara manual
      const generated = normalizeSubdomain(name);
      setForm((prev) => ({ ...prev, storeName: name }));
      setSubdomainInput(generated);
      setErrors((prev) => ({ ...prev, storeName: undefined, subdomain: undefined }));
      setSubdomainStatus("idle");
    },
    []
  );

  const handleSubdomainChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const normalized = normalizeSubdomain(e.target.value);
      setSubdomainInput(normalized);
      setErrors((prev) => ({ ...prev, subdomain: undefined }));
      setSubdomainStatus("idle");
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, description: e.target.value }));
    },
    []
  );

  // Debounce subdomain → DB availability check
  useEffect(() => {
    const validationError = validateSubdomain(subdomainInput);
    setForm((prev) => ({ ...prev, subdomain: subdomainInput }));

    if (!subdomainInput || validationError) {
      setSubdomainStatus("idle");
      return;
    }

    setSubdomainStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const data = await adminDB.query({
          tenants: {
            $: {
              where: { subdomain: subdomainInput },
              fields: ["id"],
              limit: 1,
            },
          },
        });
        setSubdomainStatus(data.tenants.length > 0 ? "taken" : "available");
      } catch (err) {
        console.error("Subdomain check failed:", err);
        setSubdomainStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [subdomainInput]);

  const validate = useCallback((): boolean => {
    const newErrors: StoreFormErrors = {};

    if (!form.storeName.trim()) {
      newErrors.storeName = "Nama toko wajib diisi.";
    } else if (form.storeName.trim().length < 3) {
      newErrors.storeName = "Nama toko minimal 3 karakter.";
    }

    const subErr = validateSubdomain(form.subdomain);
    if (subErr) {
      newErrors.subdomain = subErr;
    } else if (subdomainStatus === "taken") {
      newErrors.subdomain = "Subdomain sudah dipakai, coba yang lain.";
    } else if (subdomainStatus === "checking") {
      newErrors.subdomain = "Tunggu pengecekan selesai.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, subdomainStatus]);

  const handleNext = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      // Tidak ada db.transact di sini — hanya lanjut ke step berikutnya
      onNext(form);
    },
    [form, validate, onNext]
  );

  return (
    <form onSubmit={handleNext} className="space-y-5" noValidate>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Buat toko kamu</h2>
        <p className="text-sm text-muted-foreground">
          Isi detail toko yang akan tampil ke pelanggan
        </p>
      </div>

      {/* Store Name */}
      <div className="space-y-2">
        <Label htmlFor="storeName">
          Nama Toko <span className="text-destructive">*</span>
        </Label>
        <Input
          id="storeName"
          placeholder="contoh: Dapur Sari, Batik Jaya"
          value={form.storeName}
          onChange={handleStoreNameChange}
          autoFocus
          maxLength={60}
          className={
            errors.storeName
              ? "border-destructive focus-visible:ring-destructive"
              : "border-border focus-visible:ring-primary"
          }
        />
        {errors.storeName ? (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {errors.storeName}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nama ini akan tampil di halaman toko kamu.
          </p>
        )}
      </div>

      {/* Subdomain */}
      <div className="space-y-2">
        <Label htmlFor="subdomain">
          Alamat Toko <span className="text-destructive">*</span>
        </Label>
        <div className="flex">
          <div className="relative flex-1">
            <Input
              id="subdomain"
              placeholder="nama-toko"
              value={subdomainInput}
              onChange={handleSubdomainChange}
              maxLength={32}
              className={`rounded-r-none border-r-0 pr-8 ${
                errors.subdomain || subdomainStatus === "taken"
                  ? "border-destructive focus-visible:ring-destructive"
                  : subdomainStatus === "available"
                  ? "border-primary focus-visible:ring-primary"
                  : "border-border focus-visible:ring-primary"
              }`}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              {subdomainStatus === "checking" && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {subdomainStatus === "available" && (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              )}
              {subdomainStatus === "taken" && (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
          </div>
          <div className="h-9 px-3 flex items-center bg-muted border border-border rounded-r-md text-sm text-muted-foreground whitespace-nowrap select-none">
            .etalasee.online
          </div>
        </div>

        {subdomainStatus === "available" && !errors.subdomain && (
          <p className="text-xs text-primary flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Subdomain tersedia!
          </p>
        )}
        {subdomainStatus === "taken" && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Subdomain sudah dipakai, coba yang lain.
          </p>
        )}
        {errors.subdomain &&
          subdomainStatus !== "taken" &&
          subdomainStatus !== "available" && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {errors.subdomain}
            </p>
          )}
        {subdomainStatus === "idle" && !errors.subdomain && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Globe className="w-3 h-3 shrink-0" />
            Tokomu akan bisa diakses di{" "}
            <span className="text-foreground font-medium truncate">
              {subdomainInput || "nama-toko"}.etalasee.online
            </span>
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Deskripsi Toko{" "}
          <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
        </Label>
        <textarea
          id="description"
          placeholder="Ceritakan sedikit tentang toko kamu..."
          value={form.description}
          onChange={handleDescriptionChange}
          rows={3}
          maxLength={200}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {form.description.length}/200
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={
          subdomainStatus === "checking" || subdomainStatus === "taken"
        }
      >
        <span className="text-primary-foreground">Lanjut</span>
        <ArrowRight className="w-4 h-4 ml-2 text-primary-foreground" />
      </Button>
    </form>
  );
}

// ─── Step 3: Info Toko (kumpulkan info, lalu SATU transact atomik) ────────────

interface TenantInfoStepProps {
  userId: string;
  storeData: StoreFormValues;
  onBack: () => void;
  onSuccess: () => void;
}

function TenantInfoStep({
  userId,
  storeData,
  onBack,
  onSuccess,
}: TenantInfoStepProps) {
  const [form, setForm] = useState<TenantInfoValues>({
    whatsapp: "",
    instagram: "",
    location: "",
  });
  const [errors, setErrors] = useState<TenantInfoErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback(
    (field: keyof TenantInfoValues) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      },
    []
  );

  const validate = useCallback((): boolean => {
    const newErrors: TenantInfoErrors = {};

    if (form.whatsapp && !/^\+?[0-9]{8,15}$/.test(form.whatsapp.replace(/\s/g, ""))) {
      newErrors.whatsapp = "Nomor WhatsApp tidak valid.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const tenantId = id();
        const tenantInfoId = id();

        // Satu transact atomik: buat tenant + tenant_info + semua link sekaligus
        await db.transact([
          // 1. Buat tenant
          db.tx.tenants[tenantId]
            .update({
              name: storeData.storeName.trim(),
              subdomain: storeData.subdomain,
              description: storeData.description.trim() || undefined,
              createdAt: new Date(),
              is_public: false,
            })
            .link({ owner: userId }),

          // 2. Buat tenant_info dan langsung link ke tenant yang baru dibuat
          db.tx.tenant_info[tenantInfoId]
            .update({
              whatsapp: form.whatsapp.trim() || undefined,
              instagram: form.instagram.trim() || undefined,
              location: form.location.trim() || undefined,
            })
            .link({ tenant: tenantId }),
        ]);

        onSuccess();
      } catch (err: unknown) {
        console.error(err);
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan, silakan coba lagi."
        );
        setIsSubmitting(false);
      }
    },
    [form, storeData, userId, validate, onSuccess]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          Informasi Toko
        </h2>
        <p className="text-sm text-muted-foreground">
          Tambahkan info kontak agar pelanggan mudah menghubungimu
        </p>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Ringkasan step 2 */}
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Detail Toko
        </p>
        <p className="text-sm font-semibold text-foreground">
          {storeData.storeName}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Globe className="w-3 h-3" />
          {storeData.subdomain}.etalasee.online
        </p>
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label htmlFor="whatsapp">
          Nomor WhatsApp{" "}
          <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="whatsapp"
            placeholder="contoh: 08123456789"
            value={form.whatsapp}
            onChange={handleChange("whatsapp")}
            maxLength={16}
            className={`pl-9 ${
              errors.whatsapp
                ? "border-destructive focus-visible:ring-destructive"
                : "border-border focus-visible:ring-primary"
            }`}
          />
        </div>
        {errors.whatsapp && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {errors.whatsapp}
          </p>
        )}
      </div>

      {/* Instagram */}
      <div className="space-y-2">
        <Label htmlFor="instagram">
          Instagram{" "}
          <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
        </Label>
        <div className="relative">
          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="instagram"
            placeholder="contoh: @tokoku"
            value={form.instagram}
            onChange={handleChange("instagram")}
            maxLength={60}
            className="pl-9 border-border focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">
          Lokasi Toko{" "}
          <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="location"
            placeholder="contoh: Bandung, Jawa Barat"
            value={form.location}
            onChange={handleChange("location")}
            maxLength={100}
            className="pl-9 border-border focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>

        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner className="size-4 mr-2 text-primary-foreground" />
              <span className="text-primary-foreground">Menyimpan...</span>
            </>
          ) : (
            <>
              <span className="text-primary-foreground">Buat Toko</span>
              <ArrowRight className="w-4 h-4 ml-2 text-primary-foreground" />
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Info ini bisa diubah kapan saja dari dashboard
      </p>
    </form>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ subdomain }: { subdomain: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          Toko berhasil dibuat! 🎉
        </h2>
        <p className="text-sm text-muted-foreground">
          Tokomu sudah aktif di{" "}
          <a
            href={`https://${subdomain}.etalasee.online`}
            className="text-primary font-medium hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {subdomain}.etalasee.online
          </a>
        </p>
      </div>
      <Button
        size="lg"
        className="mt-2 w-full"
        onClick={() => {
          window.location.href = `https://www.etalasee.online/dashboard`;
        }}
      >
        <span className="text-primary-foreground">Buka Dashboard</span>
        <ArrowRight className="w-4 h-4 ml-2 text-primary-foreground" />
      </Button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const EMPTY_STORE_FORM: StoreFormValues = {
  storeName: "",
  subdomain: "",
  description: "",
};

export default function RegisterCard() {
  const { user, isLoading: authLoading } = db.useAuth();
  const [step, setStep] = useState<Step>("auth");
  const [isSuccess, setIsSuccess] = useState(false);

  // Data dari step 2 disimpan di sini — belum ke DB
  const [storeData, setStoreData] = useState<StoreFormValues>(EMPTY_STORE_FORM);

  // Cek limit toko — hanya aktif setelah user login
  const tenantLimit = useTenantLimit(user?.id);
  const isBlocked = !authLoading && user && tenantLimit.status === "blocked";

  // Ketika auth selesai, pindah ke onboarding
  useEffect(() => {
    if (!authLoading && user) {
      setStep("onboarding");
    }
  }, [user, authLoading]);

  const handleStoreDataNext = useCallback((values: StoreFormValues) => {
    setStoreData(values);
    setStep("tenantInfo");
  }, []);

  const handleBack = useCallback(() => {
    setStep("onboarding");
  }, []);

  const handleSuccess = useCallback(() => {
    setIsSuccess(true);
  }, []);

  // Judul & deskripsi card — termasuk state blocked
  const cardTitle = isSuccess
    ? "Selamat Datang!"
    : isBlocked
    ? "Batas Toko Tercapai"
    : step === "auth"
    ? "Daftar ke Etalasee"
    : step === "onboarding"
    ? "Detail Toko"
    : "Informasi Toko";

  const cardDescription = isSuccess
    ? "Toko kamu sudah siap"
    : isBlocked
    ? "Upgrade plan untuk membuat lebih banyak toko"
    : step === "auth"
    ? "Buka toko online UMKM-mu dalam 5 menit"
    : step === "onboarding"
    ? "Lengkapi detail toko kamu"
    : "Tambahkan info kontak toko (bisa dilewati)";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 h-14 flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Store className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold text-primary">Etalasee</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Sembunyikan step indicator saat success atau blocked */}
          {!isSuccess && !isBlocked && <StepIndicator current={step} />}

          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                  isBlocked
                    ? "bg-destructive/10"
                    : "bg-primary/10"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : isBlocked ? (
                  <Lock className="w-5 h-5 text-destructive" />
                ) : (
                  <Store className="w-5 h-5 text-primary" />
                )}
              </div>
              <CardTitle className="text-base text-foreground">
                {cardTitle}
              </CardTitle>
              <CardDescription>{cardDescription}</CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Loading: auth atau sedang mengecek limit */}
              {authLoading || (user && tenantLimit.status === "loading") ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner className="size-6 text-primary" />
                </div>
              ) : isSuccess ? (
                <SuccessScreen subdomain={storeData.subdomain} />
              ) : isBlocked && tenantLimit.status === "blocked" ? (
                // User sudah punya toko dan tidak boleh buat lagi
                <TenantLimitGate
                  ownedCount={tenantLimit.ownedCount}
                  dashboardUrl={tenantLimit.dashboardUrl}
                />
              ) : step === "auth" ? (
                <AuthStep />
              ) : step === "onboarding" && user ? (
                <OnboardingStep
                  initialValues={storeData}
                  onNext={handleStoreDataNext}
                />
              ) : step === "tenantInfo" && user ? (
                <TenantInfoStep
                  userId={user.id}
                  storeData={storeData}
                  onBack={handleBack}
                  onSuccess={handleSuccess}
                />
              ) : null}
            </CardContent>
          </Card>

          {!isSuccess && !isBlocked && (
            <p className="text-center text-xs text-muted-foreground mt-6">
              Sudah punya toko?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Masuk ke dashboard
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}