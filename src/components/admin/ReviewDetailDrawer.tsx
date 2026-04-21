import { useEffect, useState } from "react";
import { Star, BadgeCheck, Calendar, User, Package, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { setReviewApproval, deleteReview, updateAdminNote, type AdminReview } from "@/lib/reviews";

type Props = {
  review: AdminReview | null;
  onClose: () => void;
  onChanged: () => void;
};

export default function ReviewDetailDrawer({ review, onClose, onChanged }: Props) {
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNote(review?.admin_note ?? "");
  }, [review?.id, review?.admin_note]);

  if (!review) return null;

  const onApprove = async () => {
    setBusy(true);
    try {
      await setReviewApproval(review.id, true);
      toast.success("Review approved");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  const onReject = async () => {
    setBusy(true);
    try {
      await setReviewApproval(review.id, false);
      toast.success("Review rejected");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  const onDelete = async () => {
    if (!confirm("Delete this review permanently?")) return;
    setBusy(true);
    try {
      await deleteReview(review.id);
      toast.success("Review deleted");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  const onSaveNote = async () => {
    setSavingNote(true);
    try {
      await updateAdminNote(review.id, note);
      toast.success("Admin note saved");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <Sheet open={!!review} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Review details</SheetTitle>
          <SheetDescription>Moderate, annotate, or remove this review.</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* Product */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            {review.product_image && (
              <img
                src={review.product_image}
                alt=""
                className="h-12 w-12 rounded-md object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Package className="mr-1 inline h-3 w-3" />
                Product
              </p>
              <p className="line-clamp-2 text-sm font-semibold">{review.product_title ?? "—"}</p>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <User className="mr-1 inline h-3 w-3" /> Customer
              </p>
              <p className="mt-0.5 font-semibold">{review.customer_name || "Anonymous"}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Calendar className="mr-1 inline h-3 w-3" /> Submitted
              </p>
              <p className="mt-0.5 font-semibold">
                {new Date(review.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Status + verified */}
          <div className="flex flex-wrap items-center gap-2">
            {review.is_approved ? (
              <Badge variant="secondary">Approved</Badge>
            ) : (
              <Badge variant="outline">Pending</Badge>
            )}
            {review.order_id && (
              <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                <BadgeCheck className="h-3 w-3" /> Verified Purchase
              </Badge>
            )}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            {review.title && <p className="text-sm font-bold">{review.title}</p>}
            {review.comment ? (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {review.comment}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">No written review.</p>
            )}
          </div>

          {/* Admin note */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Admin note (internal only)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Reason for rejection, follow-up actions, etc."
              className="mt-1.5"
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={onSaveNote}
              disabled={savingNote || (note ?? "") === (review.admin_note ?? "")}
            >
              {savingNote && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save note
            </Button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {review.is_approved ? (
              <Button variant="outline" onClick={onReject} disabled={busy}>
                Reject / unpublish
              </Button>
            ) : (
              <Button onClick={onApprove} disabled={busy}>
                Approve
              </Button>
            )}
            <Button variant="destructive" onClick={onDelete} disabled={busy} className="ml-auto">
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
