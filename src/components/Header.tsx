import { Search, X, User, LogOut, ShoppingBag, Menu, Settings, CreditCard, ChevronDown, Heart } from "lucide-react";
import { useState } from "react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "./NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const languages = [
  { code: "km" as const, name: "KH", flag: "🇰🇭" },
  { code: "en" as const, name: "EN", flag: "🇬🇧" },
];

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

export const Header = ({ searchQuery, onSearchChange, onMenuToggle, isSidebarOpen }: HeaderProps) => {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  const handleSignOut = async () => {
    await signOut();
    setShowLogoutDialog(false);
    navigate("/");
  };

  return (
    <header className="glass -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2">
      <div className="flex items-center gap-2.5">
        {/* Mobile Menu Button */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        )}

        {/* Search — macOS Spotlight style */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.search}
            className="search-input pl-9 pr-8 py-1.5 h-[34px] text-[13px] rounded-md"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>



        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Wishlist */}
        {user && (
          <Link
            to="/wishlist"
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Heart className="w-4 h-4" />
          </Link>
        )}

        {/* Notifications */}
        {user && <NotificationBell />}

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          >
            <span className="text-sm">{currentLang.flag}</span>
            <span className="text-[12px] font-medium">{currentLang.name}</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${showLangMenu ? "rotate-180" : ""}`} />
          </button>

          {showLangMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
              <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[100px] z-50 animate-fade-in py-1"
                   style={{ boxShadow: 'var(--shadow-window)' }}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-accent hover:text-accent-foreground transition-colors ${
                      language === lang.code ? "text-foreground font-medium bg-accent/50" : "text-popover-foreground"
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Auth */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-[13px] text-muted-foreground hover:text-foreground">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={user.avatar_url || ""} alt={user.full_name || user.email} />
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline max-w-[100px] truncate text-[12px]">
                  {user.full_name || user.email?.split("@")[0]}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52" style={{ boxShadow: 'var(--shadow-window)' }}>
              <div className="px-2 py-1.5">
                <p className="text-[12px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/my-purchases" className="flex items-center gap-2 text-[13px]">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {language === "km" ? "កម្មវិធីដែលបានទិញ" : "My Purchases"}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/payment-history" className="flex items-center gap-2 text-[13px]">
                  <CreditCard className="w-3.5 h-3.5" />
                  {language === "km" ? "ប្រវត្តិបង់ប្រាក់" : "Payment History"}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2 text-[13px]">
                  <Settings className="w-3.5 h-3.5" />
                  {language === "km" ? "ការកំណត់គណនី" : "Profile Settings"}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="text-destructive text-[13px] gap-2">
                <LogOut className="w-3.5 h-3.5" />
                {language === "km" ? "ចាកចេញ" : "Sign Out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/auth">
            <Button size="sm" className="h-[30px] text-[13px] gap-1.5 rounded-md px-3">
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.login}</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent style={{ boxShadow: 'var(--shadow-window)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "km" ? "បញ្ជាក់ការចាកចេញ" : "Confirm Sign Out"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "km"
                ? "តើអ្នកប្រាកដថាចង់ចាកចេញពីគណនីរបស់អ្នកមែនទេ?"
                : "Are you sure you want to sign out of your account?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === "km" ? "បោះបង់" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive hover:bg-destructive/90">
              {language === "km" ? "ចាកចេញ" : "Sign Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};
