import { Smartphone } from 'lucide-react';

export function QrCodeDisplay() {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center">
        <Smartphone className="w-8 h-8 text-slate-400" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold">Integração Baileys</p>
        <p className="text-slate-400 text-sm mt-1">
          Configure o webhook no serviço Baileys apontando para{' '}
          <code className="text-blue-400 bg-slate-800 px-1 rounded text-xs">
            /api/v1/webhooks/baileys
          </code>
        </p>
      </div>
    </div>
  );
}
