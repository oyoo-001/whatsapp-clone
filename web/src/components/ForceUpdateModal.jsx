import React from 'react';
import { Download, MessageSquare, ExternalLink } from 'lucide-react';

const ForceUpdateModal = ({ updateUrl }) => {
  const telegramUrl = "https://t.me/tuchatapp";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header Decor */}
        <div className="h-24 bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                <Download className="text-white h-8 w-8" />
            </div>
        </div>

        <div className="p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            New Version Available
          </h2>
          <p className="mb-8 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            We've added new features and improved performance. To keep using TuChat, please update to the latest version.
          </p>

          <div className="space-y-3">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full rounded-2xl bg-[#24A1DE] px-6 py-4 text-white font-bold transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/30"
            >
              <MessageSquare size={20} fill="currentColor" />
              Update via Telegram
            </a>

            {updateUrl && (
                <a
                href={updateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-2xl bg-gray-100 dark:bg-gray-800 px-6 py-4 text-gray-900 dark:text-white font-semibold transition-transform hover:scale-[1.02] active:scale-95"
                >
                <ExternalLink size={18} />
                Direct Download
                </a>
            )}
          </div>

          <p className="mt-6 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
            TuChat Messenger · Official Update
          </p>
        </div>

        {/* Persistent Warning */}
        <div className="bg-amber-50 dark:bg-amber-900/20 py-2 px-4 border-t border-amber-100 dark:border-amber-900/30">
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                You won't be able to access chats until you update.
            </p>
        </div>
      </div>
    </div>
  );
};

export default ForceUpdateModal;
