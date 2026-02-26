import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GroupCard, ToggleRow } from './SettingsShared';

export function NotificationsPanel() {
  const { language } = useLanguage();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [newApps, setNewApps] = useState(false);
  const [promotions, setPromotions] = useState(false);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-foreground">
        {language === 'km' ? 'ការជូនដំណឹង' : 'Notifications'}
      </h2>

      <GroupCard>
        <ToggleRow
          label={language === 'km' ? 'ការជូនដំណឹងផុស' : 'Push Notifications'}
          description={language === 'km' ? 'ទទួលការជូនដំណឹងផុសនៅលើឧបករណ៍របស់អ្នក' : 'Receive push notifications on your device'}
          checked={pushEnabled}
          onChange={setPushEnabled}
        />
        <ToggleRow
          label={language === 'km' ? 'ការជូនដំណឹងអ៊ីមែល' : 'Email Notifications'}
          description={language === 'km' ? 'ទទួលការជូនដំណឹងតាមអ៊ីមែល' : 'Receive notifications via email'}
          checked={emailNotifs}
          onChange={setEmailNotifs}
        />
      </GroupCard>

      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1 mb-2">
        {language === 'km' ? 'ប្រភេទការជូនដំណឹង' : 'Notification Types'}
      </p>
      <GroupCard>
        <ToggleRow
          label={language === 'km' ? 'បច្ចុប្បន្នភាពការបញ្ជាទិញ' : 'Order Updates'}
          description={language === 'km' ? 'ស្ថានភាពនិងការផ្លាស់ប្តូរការបញ្ជាទិញ' : 'Order status changes and updates'}
          checked={orderUpdates}
          onChange={setOrderUpdates}
        />
        <ToggleRow
          label={language === 'km' ? 'កម្មវិធីថ្មី' : 'New Apps'}
          description={language === 'km' ? 'ជូនដំណឹងនៅពេលមានកម្មវិធីថ្មី' : 'Get notified when new apps are added'}
          checked={newApps}
          onChange={setNewApps}
        />
        <ToggleRow
          label={language === 'km' ? 'ការផ្សព្វផ្សាយ' : 'Promotions'}
          description={language === 'km' ? 'ការផ្តល់ជូនពិសេសនិងការបញ្ចុះតម្លៃ' : 'Special offers and discounts'}
          checked={promotions}
          onChange={setPromotions}
        />
      </GroupCard>
    </div>
  );
}
