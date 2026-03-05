import { useState, useRef } from 'react';
import { SEOHead } from '@/components/SEOHead';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Camera, User, Lock, Loader2, ChevronRight, Mail, Phone, Shield, Palette, Bell, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, useTranslations } from '@/contexts/LanguageContext';
import { ImageCropper } from '@/components/ImageCropper';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GroupCard, EditableRow } from '@/components/settings/SettingsShared';
import { NotificationsPanel } from '@/components/settings/NotificationsPanel';
import { AppearancePanel } from '@/components/settings/AppearancePanel';
import { PrivacyPanel } from '@/components/settings/PrivacyPanel';
import { AboutPanel } from '@/components/settings/AboutPanel';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

type SettingsSection = 'profile' | 'password' | 'notifications' | 'appearance' | 'privacy' | 'about';

// macOS sidebar nav item
function SidebarItem({ icon: Icon, label, active, onClick, color }: {
  icon: React.ElementType; label: string; active?: boolean; onClick: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors duration-100 ${
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground hover:bg-accent/50'
      }`}
    >
      <span className={`w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-white flex-shrink-0 ${color || 'bg-muted-foreground/60'}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

// macOS settings row with chevron
function SettingsRow({ icon: Icon, label, value, onClick, color }: {
  icon: React.ElementType; label: string; value?: string; onClick?: () => void; color?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 min-h-[44px] ${onClick ? 'cursor-pointer hover:bg-accent/40 active:bg-accent/60' : ''} transition-colors`}
    >
      <span className={`w-[28px] h-[28px] rounded-[7px] flex items-center justify-center text-white flex-shrink-0 ${color || 'bg-muted-foreground/50'}`}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="text-sm text-foreground flex-1">{label}</span>
      {value && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{value}</span>}
      {onClick && <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
    </div>
  );
}


export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, token, updateUser } = useAuth();
  const { language } = useLanguage();
  const t = useTranslations();

  const isMobile = useIsMobile();

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { setSelectedImage(reader.result as string); setCropperOpen(true); };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'avatar.jpg');
      const uploadResponse = await fetch(`${API_BASE_URL}/api/users/upload-avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadData = await uploadResponse.json();
      const newAvatarUrl = uploadData.url;
      const profileResponse = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName || user?.full_name, phone: phone || user?.phone, avatar_url: newAvatarUrl }),
      });
      if (!profileResponse.ok) throw new Error('Failed to save avatar');
      setAvatarUrl(newAvatarUrl);
      updateUser({ avatar_url: newAvatarUrl });
      toast({ title: language === 'km' ? 'ជោគជ័យ' : 'Success', description: language === 'km' ? 'រូបភាពត្រូវបានរក្សាទុក' : 'Profile picture saved successfully' });
    } catch {
      toast({ title: language === 'km' ? 'កំហុស' : 'Error', description: language === 'km' ? 'បរាជ័យក្នុងការផ្ទុករូបភាព' : 'Failed to upload image', variant: 'destructive' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName, phone, avatar_url: avatarUrl }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.message || 'Update failed'); }
      updateUser({ full_name: fullName, phone, avatar_url: avatarUrl });
      toast({ title: language === 'km' ? 'ជោគជ័យ' : 'Success', description: language === 'km' ? 'ព័ត៌មានផ្ទាល់ខ្លួនត្រូវបានធ្វើបច្ចុប្បន្នភាព' : 'Profile updated successfully' });
    } catch (error) {
      toast({ title: language === 'km' ? 'កំហុស' : 'Error', description: error instanceof Error ? error.message : 'Failed to update profile', variant: 'destructive' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: language === 'km' ? 'កំហុស' : 'Error', description: language === 'km' ? 'ពាក្យសម្ងាត់មិនត្រូវគ្នា' : 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: language === 'km' ? 'កំហុស' : 'Error', description: language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Password change failed');
      toast({ title: language === 'km' ? 'ជោគជ័យ' : 'Success', description: language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរ' : 'Password changed successfully' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) {
      toast({ title: language === 'km' ? 'កំហុស' : 'Error', description: error instanceof Error ? error.message : 'Failed to change password', variant: 'destructive' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) { navigate('/auth'); return null; }

  const renderProfileContent = () => (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-foreground">{t.personalInfo}</h2>

      {/* Avatar + name card */}
      <GroupCard>
        <div className="p-4 flex items-center gap-3.5">
          <div className="relative flex-shrink-0">
            <Avatar className="w-[56px] h-[56px]">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback className="text-lg bg-muted text-foreground font-medium">
                {fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm disabled:opacity-50"
            >
              {isUploadingImage ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Camera className="w-2.5 h-2.5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-foreground truncate">{fullName || user.email?.split('@')[0]}</p>
            <p className="text-[13px] text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </GroupCard>

      {/* Editable fields */}
      <GroupCard>
        <EditableRow label={t.fullName} value={fullName} onChange={setFullName} placeholder={language === 'km' ? 'បញ្ចូលឈ្មោះពេញ' : 'Enter name'} />
        <EditableRow label={t.email} value={user.email} disabled />
        <EditableRow label={t.phone} value={phone} onChange={setPhone} placeholder={language === 'km' ? 'បញ្ចូលលេខទូរស័ព្ទ' : 'Enter phone'} type="tel" />
      </GroupCard>
      <p className="text-xs text-muted-foreground px-1">
        {language === 'km' ? 'អ៊ីមែលមិនអាចផ្លាស់ប្តូរបានទេ។' : 'Email address cannot be changed.'}
      </p>

      {/* Save */}
      <GroupCard>
        <button
          onClick={handleUpdateProfile}
          disabled={isUpdatingProfile}
          className="w-full px-4 py-2.5 text-sm font-medium text-primary text-center disabled:opacity-50 active:bg-accent/50 transition-colors"
        >
          {isUpdatingProfile ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{language === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...'}</span>
          ) : (language === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes')}
        </button>
      </GroupCard>
    </div>
  );

  const renderPasswordContent = () => (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-foreground">{t.changePassword}</h2>

      <GroupCard>
        <EditableRow label={language === 'km' ? 'បច្ចុប្បន្ន' : 'Current'} value={currentPassword} onChange={setCurrentPassword} placeholder="••••••••" type="password" />
        <EditableRow label={language === 'km' ? 'ថ្មី' : 'New'} value={newPassword} onChange={setNewPassword} placeholder="••••••••" type="password" />
        <EditableRow label={language === 'km' ? 'បញ្ជាក់' : 'Confirm'} value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" type="password" />
      </GroupCard>
      <p className="text-xs text-muted-foreground px-1">
        {language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។' : 'Password must be at least 6 characters.'}
      </p>

      <GroupCard>
        <button
          onClick={handleChangePassword}
          disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
          className="w-full px-4 py-2.5 text-sm font-medium text-primary text-center disabled:opacity-50 disabled:text-muted-foreground active:bg-accent/50 transition-colors"
        >
          {isChangingPassword ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{language === 'km' ? 'កំពុងផ្លាស់ប្តូរ...' : 'Changing...'}</span>
          ) : t.changePassword}
        </button>
      </GroupCard>
    </div>
  );

  return (
    <>
    <SEOHead title="Profile" noindex />
    <div className={`min-h-screen bg-secondary/50 ${language === 'km' ? 'font-khmer' : ''}`}>
      {/* macOS title bar */}
      <header className="sticky top-0 z-40 glass px-4 py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (window.history.length > 1) { navigate(-1); } else { navigate('/'); } }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {language === 'km' ? 'ត្រឡប់' : 'Back'}
            </button>
            <span className="text-muted-foreground/30 text-sm">/</span>
            <span className="text-sm font-medium text-foreground">{language === 'km' ? 'ការកំណត់' : 'System Settings'}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className={`${isMobile ? 'flex flex-col' : 'flex gap-0'} min-h-[calc(100vh-80px)] bg-card rounded-xl overflow-hidden border border-border/60`} style={{ boxShadow: 'var(--shadow-window)' }}>
          {/* Sidebar - horizontal on mobile */}
          {isMobile ? (
            <nav className="flex items-center gap-1 px-3 py-2 border-b border-border/50 overflow-x-auto bg-sidebar-background/60 scrollbar-none">
              <button
                onClick={() => setActiveSection('profile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${activeSection === 'profile' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-accent/50'}`}
              >
                <User className="w-3.5 h-3.5" /> {t.personalInfo}
              </button>
              <button
                onClick={() => setActiveSection('password')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${activeSection === 'password' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-accent/50'}`}
              >
                <Lock className="w-3.5 h-3.5" /> {t.changePassword}
              </button>
              <button
                onClick={() => setActiveSection('notifications')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${activeSection === 'notifications' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-accent/50'}`}
              >
                <Bell className="w-3.5 h-3.5" /> {language === 'km' ? 'ការជូនដំណឹង' : 'Notifications'}
              </button>
              <button
                onClick={() => setActiveSection('appearance')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${activeSection === 'appearance' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-accent/50'}`}
              >
                <Palette className="w-3.5 h-3.5" /> {language === 'km' ? 'រូបរាង' : 'Appearance'}
              </button>
              <button
                onClick={() => setActiveSection('privacy')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${activeSection === 'privacy' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-accent/50'}`}
              >
                <Shield className="w-3.5 h-3.5" /> {language === 'km' ? 'ឯកជនភាព' : 'Privacy'}
              </button>
              <button
                onClick={() => setActiveSection('about')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${activeSection === 'about' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-accent/50'}`}
              >
                <Info className="w-3.5 h-3.5" /> {language === 'km' ? 'អំពី' : 'About'}
              </button>
            </nav>
          ) : (
            <aside className="w-[220px] flex-shrink-0 bg-sidebar-background/60 border-r border-border/50 p-3 space-y-1 overflow-y-auto">
              {/* User profile at top */}
              <button
                onClick={() => setActiveSection('profile')}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg mb-2 hover:bg-accent/50 transition-colors"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="text-xs bg-muted text-foreground font-medium">
                    {fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate leading-tight">{fullName || user.email?.split('@')[0]}</p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">{language === 'km' ? 'គណនី' : 'Account'}</p>
                </div>
              </button>

              <div className="border-t border-border/50 my-2" />

              <SidebarItem icon={User} label={t.personalInfo} active={activeSection === 'profile'} onClick={() => setActiveSection('profile')} color="bg-blue-500" />
              <SidebarItem icon={Lock} label={t.changePassword} active={activeSection === 'password'} onClick={() => setActiveSection('password')} color="bg-gray-500" />

              <div className="border-t border-border/50 my-2" />

              <SidebarItem icon={Bell} label={language === 'km' ? 'ការជូនដំណឹង' : 'Notifications'} active={activeSection === 'notifications'} onClick={() => setActiveSection('notifications')} color="bg-red-500" />
              <SidebarItem icon={Palette} label={language === 'km' ? 'រូបរាង' : 'Appearance'} active={activeSection === 'appearance'} onClick={() => setActiveSection('appearance')} color="bg-purple-500" />
              <SidebarItem icon={Shield} label={language === 'km' ? 'ឯកជនភាព' : 'Privacy & Security'} active={activeSection === 'privacy'} onClick={() => setActiveSection('privacy')} color="bg-blue-600" />
              <SidebarItem icon={Info} label={language === 'km' ? 'អំពី' : 'About'} active={activeSection === 'about'} onClick={() => setActiveSection('about')} color="bg-gray-400" />
            </aside>
          )}

          {/* Content */}
          <main className={`flex-1 overflow-y-auto bg-secondary/30 ${isMobile ? 'p-4' : 'p-8'}`}>
            {activeSection === 'profile' && renderProfileContent()}
            {activeSection === 'password' && renderPasswordContent()}
            {activeSection === 'notifications' && <NotificationsPanel />}
            {activeSection === 'appearance' && <AppearancePanel />}
            {activeSection === 'privacy' && <PrivacyPanel />}
            {activeSection === 'about' && <AboutPanel />}
          </main>
        </div>
      </div>

      <ImageCropper isOpen={cropperOpen} onClose={() => setCropperOpen(false)} imageSrc={selectedImage} onCropComplete={handleCropComplete} />
    </div>
    </>
  );
}
