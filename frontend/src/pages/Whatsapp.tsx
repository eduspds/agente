import { QrCodeDisplay } from '../components/whatsapp/QrCodeDisplay';

export function Whatsapp() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">WhatsApp</h1>
      <QrCodeDisplay />
    </div>
  );
}
