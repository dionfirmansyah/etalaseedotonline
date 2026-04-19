import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

import { AlertCircle, ArrowRight } from "lucide-react";

type Props = {
  tenantId: string;
};

type FormValues = {
  location: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
};

export default function TenantInfoStep({ tenantId }: Props) {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormValues>({
    location: "",
    instagram: "",
    tiktok: "",
    whatsapp: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback(
    (field: keyof FormValues, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const tenantInfoId = id();

        await db.transact([
          db.tx.tenant_info[tenantInfoId].update({
            location: form.location || undefined,
            instagram: form.instagram || undefined,
            tiktok: form.tiktok || undefined,
            whatsapp: form.whatsapp || undefined,
          }),

          // 🔥 link ke tenant
          db.tx.tenants[tenantId].link({
            info: tenantInfoId,
          }),
        ]);

        // redirect ke dashboard tenant
        window.location.href = `/dashboard`;
      } catch (err: unknown) {
        console.error(err);
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Gagal menyimpan informasi toko"
        );
        setIsSubmitting(false);
      }
    },
    [form, tenantId]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          Informasi Toko
        </h2>
        <p className="text-sm text-muted-foreground">
          Tambahkan detail tambahan agar toko kamu lebih lengkap
        </p>
      </div>

      {/* Error */}
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Location */}
      <div className="space-y-2">
        <Label>Lokasi</Label>
        <Input
          placeholder="Contoh: Jakarta, Indonesia"
          value={form.location}
          onChange={(e) => handleChange("location", e.target.value)}
        />
      </div>

      {/* Instagram */}
      <div className="space-y-2">
        <Label>Instagram</Label>
        <Input
          placeholder="@tokomu"
          value={form.instagram}
          onChange={(e) => handleChange("instagram", e.target.value)}
        />
      </div>

      {/* TikTok */}
      <div className="space-y-2">
        <Label>TikTok</Label>
        <Input
          placeholder="@tokomu"
          value={form.tiktok}
          onChange={(e) => handleChange("tiktok", e.target.value)}
        />
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label>WhatsApp</Label>
        <Input
          placeholder="628123456789"
          value={form.whatsapp}
          onChange={(e) => handleChange("whatsapp", e.target.value)}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Spinner className="size-4 mr-2 text-primary-foreground" />
            <span className="text-primary-foreground">Menyimpan...</span>
          </>
        ) : (
          <>
            <span className="text-primary-foreground">Selesai</span>
            <ArrowRight className="w-4 h-4 ml-2 text-primary-foreground" />
          </>
        )}
      </Button>
    </form>
  );
}