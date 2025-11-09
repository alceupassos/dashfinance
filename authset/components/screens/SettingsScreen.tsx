import React from 'react';
import Toggle from '../shared/Toggle.tsx';

const categories = [
  { id: 'general', label: 'General' },
  { id: 'agents', label: 'Agents' },
  { id: 'security', label: 'Security' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'network', label: 'Network' },
  { id: 'docs', label: 'Docs' },
];

const quickActions = [
  {
    title: 'Manage Account',
    description: 'Controle sua assinatura, faturamento e limites.',
    action: 'Open',
  },
  {
    title: 'Upgrade to Ultra',
    description: 'Libere agentes paralelos, 20× mais uso e acesso antecipado.',
    action: 'Upgrade',
    badge: 'Beta',
  },
];

const preferenceCards = [
  {
    title: 'Default Layout',
    description: 'Escolha o foco padrão entre Agente ou Editor.',
    actions: ['Agent', 'Editor'],
  },
  {
    title: 'Editor Settings',
    description: 'Fonte, minimapa, auto-format e mais.',
    action: 'Open',
  },
  {
    title: 'Keyboard Shortcuts',
    description: 'Configure atalhos universais.',
    action: 'Open',
  },
  {
    title: 'Import Settings',
    description: 'Traga configs do VS Code ou Cursor.',
    action: 'Import',
  },
];

const SettingsScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = React.useState('general');
  const [biometrics, setBiometrics] = React.useState(true);
  const [autoLock, setAutoLock] = React.useState(false);
  const [notifications, setNotifications] = React.useState({
    system: true,
    menuIcon: true,
    completionSound: true,
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full text-white/90">
      <aside className="lg:w-48 space-y-1">
        <p className="text-xs uppercase text-white/40 tracking-widest mb-2">Settings</p>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
              selectedCategory === cat.id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:bg-white/5'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-gradient-to-br from-orange-400 to-pink-400" />
            {cat.label}
          </button>
        ))}
      </aside>

      <section className="flex-1 space-y-8">
        <div>
          <header className="mb-4">
            <h1 className="text-3xl font-semibold tracking-tight">General</h1>
            <p className="text-white/50 text-sm">
              Preferências principais aplicadas em todos os dispositivos sincronizados via AuthSet.
            </p>
          </header>

          <div className="grid gap-4">
            {quickActions.map((action) => (
              <div
                key={action.title}
                className="rounded-2xl bg-white/5 border border-white/5 p-4 flex items-center justify-between shadow-[0_15px_35px_rgba(0,0,0,0.35)]"
              >
                <div>
                  <p className="text-base font-semibold">{action.title}</p>
                  <p className="text-sm text-white/60">{action.description}</p>
                </div>
                <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-medium hover:bg-white/20 transition">
                  {action.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Preferences</h2>
          <div className="grid gap-4">
            {preferenceCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl bg-gradient-to-br from-white/6 via-white/4 to-white/2 border border-white/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold">{card.title}</p>
                    <p className="text-sm text-white/60">{card.description}</p>
                  </div>
                  {card.actions ? (
                    <div className="flex gap-2 bg-black/30 p-1 rounded-xl border border-white/10">
                      {card.actions.map((option) => (
                        <button
                          key={option}
                          className={`px-3 py-1 text-xs rounded-lg ${
                            option === card.actions[1]
                              ? 'bg-white text-black'
                              : 'text-white/70'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm hover:bg-white/20 transition">
                      {card.action}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Notifications</h2>
          <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">System notifications</p>
                <p className="text-sm text-white/60">Alertas quando o agente finaliza ou precisa de atenção.</p>
              </div>
              <Toggle
                label=""
                enabled={notifications.system}
                setEnabled={(v) => setNotifications((prev) => ({ ...prev, system: v }))}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">Menu bar icon</p>
                <p className="text-sm text-white/60">Mostra o AuthSet na barra para aprovações rápidas.</p>
              </div>
              <Toggle
                label=""
                enabled={notifications.menuIcon}
                setEnabled={(v) => setNotifications((prev) => ({ ...prev, menuIcon: v }))}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">Completion sound</p>
                <p className="text-sm text-white/60">Som suave ao finalizar sincronizações.</p>
              </div>
              <Toggle
                label=""
                enabled={notifications.completionSound}
                setEnabled={(v) => setNotifications((prev) => ({ ...prev, completionSound: v }))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Privacy & Security</h2>
          <p className="text-sm text-white/60">
            Gerencie chaves BLE confiáveis e requisitos de biometria.
          </p>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <Toggle label="Usar biometria facial + 2 digitais aleatórias" enabled={biometrics} setEnabled={setBiometrics} />
            <Toggle label="Bloqueio automático em 30s sem BLE próximo" enabled={autoLock} setEnabled={setAutoLock} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsScreen;
