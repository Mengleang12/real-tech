import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { User, UserX } from "lucide-react";

interface GuestCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAccount: () => void;
  onSelectGuest: () => void;
}

const GuestCheckoutDialog = ({ open, onOpenChange, onSelectAccount, onSelectGuest }: GuestCheckoutDialogProps) => {
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {language === "km" ? "របៀបបង់ប្រាក់" : "How would you like to checkout?"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {language === "km"
              ? "សូមជ្រើសរើសបង់ប្រាក់ដោយគណនី ឬជាភ្ញៀវ"
              : "Sign in for order history, or continue as a guest"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <Button className="w-full gap-2 h-11" onClick={onSelectAccount}>
            <User className="w-4 h-4" />
            {language === "km" ? "បង់ប្រាក់ជាមួយគណនី" : "Checkout with Account"}
          </Button>
          <Button variant="outline" className="w-full gap-2 h-11" onClick={onSelectGuest}>
            <UserX className="w-4 h-4" />
            {language === "km" ? "បង់ប្រាក់ជាភ្ញៀវ" : "Continue as Guest"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestCheckoutDialog;
