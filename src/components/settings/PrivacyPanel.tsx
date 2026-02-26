import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GroupCard, ToggleRow } from './SettingsShared';
import { Shield, Eye, Activity } from 'lucide-react';

export function PrivacyPanel() {
  const { language } = useLanguage();
  const [activityTracking, setActivityTracking] = useState(true);
  const [shareUsageData, setShareUsageData] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-foreground">
        {language === 'km' ? 'ឯកជនភាព និងសុវត្ថិភាព' : 'Privacy & Security'}
      </h2>

      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">
        {language === 'km' ? 'ឯកជនភាព' : 'Privacy'}
      </p>
      <GroupCard>
        <ToggleRow
          label={language === 'km' ? 'កត់ត្រាសកម្មភាព' : 'Activity Tracking'}
          description={language === 'km' ? 'កត់ត្រាសកម្មភាពរបស់អ្នកសម្រាប់បទពិសោធន៍កាន់តែល្អ' : 'Track your activity for a better experience'}
          checked={activityTracking}
          onChange={setActivityTracking}
        />
        <ToggleRow
          label={language === 'km' ? 'ចែករំលែកទិន្នន័យការប្រើប្រាស់' : 'Share Usage Data'}
          description={language === 'km' ? 'ជួយយើងកែលម្អដោយចែករំលែកទិន្នន័យអនាមិក' : 'Help us improve by sharing anonymous data'}
          checked={shareUsageData}
          onChange={setShareUsageData}
        />
        <ToggleRow
          label={language === 'km' ? 'បង្ហាញស្ថានភាពអនឡាញ' : 'Show Online Status'}
          description={language === 'km' ? 'អនុញ្ញាតឱ្យអ្នកដទៃឃើញថាអ្នកអនឡាញ' : 'Let others see when you are online'}
          checked={showOnlineStatus}
          onChange={setShowOnlineStatus}
        />
      </GroupCard>

      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1 mt-6">
        {language === 'km' ? 'សុវត្ថិភាព' : 'Security'}
      </p>
      <GroupCard>
        <div className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
          <div className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center text-white bg-green-500 flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground">{language === 'km' ? 'គណនីត្រូវបានការពារ' : 'Account Protected'}</p>
            <p className="text-xs text-muted-foreground">{language === 'km' ? 'គណនីរបស់អ្នកមានសុវត្ថិភាព' : 'Your account is secure'}</p>
          </div>
          <span className="text-xs text-green-500 font-medium">✓</span>
        </div>
      </GroupCard>
    </div>
  );
}
