import { useTranslation } from 'react-i18next';

export default function LangSwitch() {
  const { i18n, t } = useTranslation();

  const toggle = () => {
    const next = i18n.language === 'zh-CN' ? 'en' : 'zh-CN';
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      className="px-2 py-1 text-[11px] font-medium text-fg-secondary border border-border rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors"
    >
      {i18n.language === 'zh-CN' ? t('langSwitch.en') : t('langSwitch.zh')}
    </button>
  );
}
