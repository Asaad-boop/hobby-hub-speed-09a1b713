import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Truck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  pathaoListCities,
  pathaoListZones,
  pathaoListAreas,
  pathaoSendOrder,
  pathaoBulkSend,
} from "@/lib/pathao.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  orderIds: string[]; // 1 = single, >1 = bulk
  onDone?: () => void;
};

type Opt = { id: number; name: string };

export function PathaoSendDialog({ open, onClose, orderIds, onDone }: Props) {
  const listCities = useServerFn(pathaoListCities);
  const listZones = useServerFn(pathaoListZones);
  const listAreas = useServerFn(pathaoListAreas);
  const sendOne = useServerFn(pathaoSendOrder);
  const sendBulk = useServerFn(pathaoBulkSend);

  const [cities, setCities] = useState<Opt[]>([]);
  const [zones, setZones] = useState<Opt[]>([]);
  const [areas, setAreas] = useState<Opt[]>([]);
  const [cityId, setCityId] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");
  const [areaId, setAreaId] = useState<string>("");
  const [weight, setWeight] = useState<string>("0.5");
  const [deliveryType, setDeliveryType] = useState<string>("48");
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isBulk = orderIds.length > 1;

  useEffect(() => {
    if (!open) return;
    setLoadingCities(true);
    listCities({ data: {} } as any)
      .then((r: any) => setCities(r.cities ?? []))
      .catch((e) => toast.error("City load failed: " + e.message))
      .finally(() => setLoadingCities(false));
  }, [open, listCities]);

  useEffect(() => {
    setZones([]);
    setZoneId("");
    setAreas([]);
    setAreaId("");
    if (!cityId) return;
    setLoadingZones(true);
    listZones({ data: { cityId: Number(cityId) } } as any)
      .then((r: any) => setZones(r.zones ?? []))
      .catch((e) => toast.error("Zone load failed: " + e.message))
      .finally(() => setLoadingZones(false));
  }, [cityId, listZones]);

  useEffect(() => {
    setAreas([]);
    setAreaId("");
    if (!zoneId) return;
    setLoadingAreas(true);
    listAreas({ data: { zoneId: Number(zoneId) } } as any)
      .then((r: any) => setAreas(r.areas ?? []))
      .catch(() => {/* areas optional */})
      .finally(() => setLoadingAreas(false));
  }, [zoneId, listAreas]);

  const reset = () => {
    setCityId(""); setZoneId(""); setAreaId(""); setWeight("0.5"); setDeliveryType("48");
  };

  async function submit() {
    if (!cityId || !zoneId) {
      toast.error("Please select city and zone");
      return;
    }
    setSubmitting(true);
    const t = toast.loading(isBulk ? `Sending ${orderIds.length} orders…` : "Sending to Pathao…");
    try {
      if (isBulk) {
        const res: any = await sendBulk({
          data: {
            orderIds,
            cityId: Number(cityId),
            zoneId: Number(zoneId),
            areaId: areaId ? Number(areaId) : undefined,
            deliveryType: Number(deliveryType),
            itemWeight: Number(weight),
            itemType: 2,
          },
        } as any);
        const ok = res.results.filter((r: any) => r.ok).length;
        const fail = res.results.length - ok;
        toast.success(`Sent: ${ok}, Failed: ${fail}`, { id: t });
      } else {
        const res: any = await sendOne({
          data: {
            orderId: orderIds[0],
            cityId: Number(cityId),
            zoneId: Number(zoneId),
            areaId: areaId ? Number(areaId) : undefined,
            deliveryType: Number(deliveryType),
            itemWeight: Number(weight),
            itemType: 2,
            itemQuantity: 1,
          },
        } as any);
        toast.success(`Consignment: ${res.consignmentId}`, { id: t });
      }
      reset();
      onDone?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Pathao send failed", { id: t });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {isBulk ? `Send ${orderIds.length} orders to Pathao` : "Send order to Pathao"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="text-xs">City</Label>
            <Select value={cityId} onValueChange={setCityId} disabled={loadingCities}>
              <SelectTrigger><SelectValue placeholder={loadingCities ? "Loading…" : "Select city"} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {cities.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Zone</Label>
            <Select value={zoneId} onValueChange={setZoneId} disabled={!cityId || loadingZones}>
              <SelectTrigger><SelectValue placeholder={loadingZones ? "Loading…" : "Select zone"} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Area (optional)</Label>
            <Select value={areaId} onValueChange={setAreaId} disabled={!zoneId || loadingAreas || areas.length === 0}>
              <SelectTrigger><SelectValue placeholder={loadingAreas ? "Loading…" : (areas.length === 0 ? "No areas" : "Select area")} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {areas.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Weight (kg)</Label>
              <Input type="number" min="0.5" max="10" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Delivery type</Label>
              <Select value={deliveryType} onValueChange={setDeliveryType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="48">Normal (48h)</SelectItem>
                  <SelectItem value="12">On-demand (12h)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !cityId || !zoneId}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
