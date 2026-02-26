import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Navigation } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface DeliveryInfo {
  phone: string;
  address: string;
  mapUrl?: string;
  lat?: number;
  lng?: number;
}

interface DeliveryInfoFormProps {
  value: DeliveryInfo;
  onChange: (info: DeliveryInfo) => void;
}

const DeliveryInfoForm = ({ value, onChange }: DeliveryInfoFormProps) => {
  const { language } = useLanguage();
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onChange({
          ...value,
          lat: latitude,
          lng: longitude,
          mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
        });
        setShowMap(true);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  };

  const clearLocation = () => {
    onChange({ ...value, lat: undefined, lng: undefined, mapUrl: undefined });
    setShowMap(false);
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        {language === "km" ? "ព័ត៌មានដឹកជញ្ជូន" : "Delivery Information"}
      </h3>

      <div className="space-y-1.5">
        <Label htmlFor="delivery-phone" className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Phone className="w-3 h-3" />
          {language === "km" ? "លេខទូរសព្ទ" : "Phone Number"} *
        </Label>
        <Input
          id="delivery-phone"
          type="tel"
          placeholder="0XX XXX XXXX"
          value={value.phone}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, "");
            if (val.length <= 10) onChange({ ...value, phone: val });
          }}
          className="h-9 text-sm"
        />
        {value.phone.length > 0 && !/^0[1-9][0-9]{7,8}$/.test(value.phone) && (
          <p className="text-[11px] text-destructive">
            {language === "km" ? "លេខទូរសព្ទមិនត្រឹមត្រូវ (ឧ. 0XX XXX XXXX)" : "Invalid Cambodian phone number (e.g. 0XX XXX XXXX)"}
          </p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="delivery-address" className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          {language === "km" ? "អាសយដ្ឋាន" : "Delivery Address"} *
        </Label>
        <Textarea
          id="delivery-address"
          placeholder={language === "km" ? "បញ្ចូលអាសយដ្ឋានដឹកជញ្ជូន..." : "Enter your delivery address..."}
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          className="min-h-[60px] text-sm resize-none"
        />
      </div>

      {/* Pin Map Location (optional) */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Navigation className="w-3 h-3" />
          {language === "km" ? "ទីតាំងផែនទី (ស្រេចចិត្ត)" : "Map Location (optional)"}
        </Label>

        {value.lat && value.lng ? (
          <div className="space-y-2">
            <div className="rounded-lg overflow-hidden border border-border/40">
              <iframe
                src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${value.lng}!3d${value.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s!4v1`}
                width="100%"
                height="150"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Delivery location"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                📍 {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </span>
              <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={clearLocation}>
                {language === "km" ? "លុបទីតាំង" : "Remove"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5 h-9"
            onClick={handleGetLocation}
            disabled={locating}
          >
            <Navigation className="w-3 h-3" />
            {locating
              ? language === "km" ? "កំពុងស្វែងរក..." : "Locating..."
              : language === "km" ? "📍 ប្រើទីតាំងបច្ចុប្បន្ន" : "📍 Use Current Location"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DeliveryInfoForm;
