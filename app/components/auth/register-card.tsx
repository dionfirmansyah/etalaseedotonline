import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { GoogleLogin } from "@react-oauth/google";
import { useOAuthIDB } from "@/hooks/useOAuthIDB";
import { db, adminDB } from "@/lib/db";
import { slug } from "@/lib/utils";
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
} from "lucide-react";
import { id } from "@instantdb/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "auth" | "onboarding";

type SubdomainStatus = "idle" | "checking" | "available" | "taken";

type FormValues = {
  storeName: string;
  subdomain: string;
  description: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

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

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "auth", label: "Masuk" },
    { key: "onboarding", label: "Buat Toko" },
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
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  i + 1
                )}
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

// ─── Auth Step ────────────────────────────────────────────────────────────────

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

      {/* Security badge */}
      <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <span className="text-primary font-medium text-center">
          Login aman dengan enkripsi end-to-end
        </span>
      </div>

      {/* Google Login button */}
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

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Memproses login, mohon tunggu...</span>
        </div>
      )}

      <Separator />

      {/* Terms */}
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
        <Link
          to="/login"
          className="text-primary font-medium hover:underline"
        >
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}

// ─── Onboarding Step ──────────────────────────────────────────────────────────

function OnboardingStep({ userId }: { userId: string }) {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormValues>({
    storeName: "",
    subdomain: "",
    description: "",
  });
  // Separate display state for subdomain input — debounced before hitting form/DB
  const [subdomainInput, setSubdomainInput] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [subdomainStatus, setSubdomainStatus] =
    useState<SubdomainStatus>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Normalize: collapse spaces/double-spaces → single "-", strip invalid chars
  const normalizeSubdomain = (value: string) => 
	value
      .toLowerCase()
      .replace(/\s+/g, "-")        // spasi → -
      .replace(/[^a-z0-9-]/g, "") // hapus karakter aneh
      .replace(/-+/g, "-")        // double -- jadi -
      .replace(/^-|-$/g, "");     // hapus - di awal/akhir

  // Auto-generate subdomain from store name (display only — DB check debounced below)
  const handleStoreNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      const generated = normalizeSubdomain(name);

	  console.log("ini", generated)
      setForm((prev) => ({ ...prev, storeName: name }));
      setSubdomainInput(generated);
      setErrors((prev) => ({ ...prev, storeName: undefined, subdomain: undefined }));
      setSubdomainStatus("idle");
    },
    []
  );

  // Manual subdomain edit — normalize on the fly, debounce DB check
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

  // Debounce: commit subdomainInput → form.subdomain + trigger DB check after 500ms
  useEffect(() => {
    const validationError = validateSubdomain(subdomainInput);

    if (!subdomainInput || validationError) {
      // Update form immediately so validation can read the latest value
      setForm((prev) => ({ ...prev, subdomain: subdomainInput }));
      setSubdomainStatus("idle");
      return;
    }

    setSubdomainStatus("checking");

    const timer = setTimeout(async () => {
      // Commit to form state only when debounce fires
      setForm((prev) => ({ ...prev, subdomain: subdomainInput }));

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
    const newErrors: FormErrors = {};

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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const tenantId = id();

        await db.transact([
          db.tx.tenants[tenantId].update({
            name: form.storeName.trim(),
            subdomain: form.subdomain,
            description: form.description.trim() || undefined,
            createdAt: new Date(),
			is_public: false
          }),
          db.tx.tenants[tenantId].link({ owner: userId }),
        ]);

        // Redirect to tenant dashboard
        window.location.href = `https://${form.subdomain}.etalasee.online/admin/dashboard`;
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
    [form, userId, validate]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          Buat toko kamu
        </h2>
        <p className="text-sm text-muted-foreground">
          Isi detail toko yang akan tampil ke pelanggan
        </p>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

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
            {/* Inline status icon */}
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
          {/* Suffix */}
          <div className="h-9 px-3 flex items-center bg-muted border border-border rounded-r-md text-sm text-muted-foreground whitespace-nowrap select-none">
            .etalasee.online
          </div>
        </div>

        {/* Status message */}
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
          <span className="text-muted-foreground font-normal text-xs">
            (opsional)
          </span>
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

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={
          isSubmitting ||
          subdomainStatus === "checking" ||
          subdomainStatus === "taken"
        }
      >
        {isSubmitting ? (
          <>
            <Spinner className="size-4 mr-2 text-primary-foreground" />
            <span className="text-primary-foreground">Membuat toko...</span>
          </>
        ) : (
          <>
            <span className="text-primary-foreground">Buat Toko Sekarang</span>
            <ArrowRight className="w-4 h-4 ml-2 text-primary-foreground" />
          </>
        )}
      </Button>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RegisterCard() {
  const { user, isLoading: authLoading } = db.useAuth();
  const [step, setStep] = useState<Step>("auth");

  // When auth completes (after Google redirect), move to onboarding
  useEffect(() => {
    if (!authLoading && user) {
      setStep("onboarding");
    }
  }, [user, authLoading]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-border px-4 h-14 flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Store className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold text-primary">Etalasee</span>
        </Link>
      </header>

	  

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <StepIndicator current={step} />

          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base text-foreground">
                {step === "auth" ? "Daftar ke Etalasee" : "Detail Toko"}
              </CardTitle>
              <CardDescription>
                {step === "auth"
                  ? "Buka toko online UMKM-mu dalam 5 menit"
                  : "Lengkapi informasi toko sebelum mulai berjualan"}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              {authLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner className="size-6 text-primary" />
                </div>
              ) : step === "auth" ? (
                <AuthStep />
              ) : user ? (
                <OnboardingStep userId={user.id} />
              ) : null}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Sudah punya toko?{" "}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Masuk ke dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}