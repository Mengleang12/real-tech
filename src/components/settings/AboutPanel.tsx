import { useLanguage } from '@/contexts/LanguageContext';
import { GroupCard, InfoRow } from './SettingsShared';

export function AboutPanel() {
  const { language } = useLanguage();

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-foreground">
        {language === 'km' ? 'អំពី' : 'About'}
      </h2>

      <GroupCard>
        <InfoRow label={language === 'km' ? 'ឈ្មោះកម្មវិធី' : 'App Name'} value="Realtech Computer" />
        <InfoRow label={language === 'km' ? 'កំណែ' : 'Version'} value="2.0.0" />
        <InfoRow label={language === 'km' ? 'អ្នកអភិវឌ្ឍន៍' : 'Developer'} value="Realtech Computer" />
        <InfoRow label={language === 'km' ? 'គេហទំព័រ' : 'Website'} value="realtechcomputer.com" />
      </GroupCard>

      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1 mt-6">
        {language === 'km' ? 'ច្បាប់' : 'Legal'}
      </p>
      <GroupCard>
        <div className="px-4 py-3 min-h-[44px] flex items-center cursor-pointer hover:bg-accent/40 transition-colors">
          <span className="text-sm text-primary flex-1">{language === 'km' ? 'លក្ខខណ្ឌសេវាកម្ម' : 'Terms of Service'}</span>
        </div>
        <div className="px-4 py-3 min-h-[44px] flex items-center cursor-pointer hover:bg-accent/40 transition-colors">
          <span className="text-sm text-primary flex-1">{language === 'km' ? 'គោលការណ៍ឯកជនភាព' : 'Privacy Policy'}</span>
        </div>
        <div className="px-4 py-3 min-h-[44px] flex items-center cursor-pointer hover:bg-accent/40 transition-colors">
          <span className="text-sm text-primary flex-1">{language === 'km' ? 'អាជ្ញាប័ណ្ណ' : 'Licenses'}</span>
        </div>
      </GroupCard>

      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1 mt-6">
        {language === 'km' ? 'ការបដិសេធ' : 'Disclaimer'}
      </p>
      <GroupCard>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {language === 'km' 
              ? 'Realtech Computer មិនលក់កម្មវិធីទេ។ យើងផ្តល់ដំណោះស្រាយ និងការណែនាំអំពីរបៀបដំឡើងកម្មវិធីនៅលើឧបករណ៍របស់អ្នក។ តម្លៃដែលបានបង់គឺសម្រាប់សេវាកម្មដំឡើង និងជំនួយបច្ចេកទេសរបស់យើង មិនមែនសម្រាប់កម្មវិធីខ្លួនឯងទេ។'
              : 'Realtech Computer does not sell apps. We provide solutions and guidance on how to install applications on your device. The price paid is for our installation service and technical support, not for the software itself.'
            }
          </p>
        </div>
      </GroupCard>

      <p className="text-center text-xs text-muted-foreground mt-8">
        © {new Date().getFullYear()} Realtech Computer. All rights reserved.
      </p>
    </div>
  );
}
