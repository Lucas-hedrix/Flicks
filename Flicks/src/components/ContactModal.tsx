import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdChat, MdClose, MdStar, MdMovie, MdSupportAgent } from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';

type ContactType = 'review' | 'request' | 'support' | null;

export const ContactModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ContactType>(null);
  const [message, setMessage] = useState('');

  const WHATSAPP_NUMBER = '2349161867080';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !message.trim()) return;

    let prefix = '';
    switch (selectedType) {
      case 'review':
        prefix = '🌟 *New Review:* ';
        break;
      case 'request':
        prefix = '🎬 *Movie Request:* ';
        break;
      case 'support':
        prefix = '🛠️ *Support Chat:* ';
        break;
    }

    const fullMessage = encodeURIComponent(`${prefix}\n\n${message}`);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${fullMessage}`;
    
    window.open(whatsappUrl, '_blank');
    setIsOpen(false);
    setMessage('');
    setSelectedType(null);
  };

  const contactOptions = [
    { id: 'review', icon: <MdStar size={24} />, label: 'Submit Review', color: 'text-yellow-400' },
    { id: 'request', icon: <MdMovie size={24} />, label: 'Request Movie', color: 'text-blue-400' },
    { id: 'support', icon: <MdSupportAgent size={24} />, label: 'Chat with Support', color: 'text-green-400' },
  ] as const;

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 p-4 bg-netflix-red text-white rounded-full shadow-lg shadow-netflix-red/30 hover:scale-110 transition-transform"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <MdChat className="text-2xl" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Contact Us</h2>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition"
                  >
                    <MdClose size={24} />
                  </button>
                </div>

                {!selectedType ? (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm mb-4">How can we help you today?</p>
                    {contactOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedType(opt.id as ContactType)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-netflix-red/50 transition group"
                      >
                        <div className={`p-3 rounded-lg bg-zinc-900 ${opt.color}`}>
                          {opt.icon}
                        </div>
                        <span className="text-white font-medium group-hover:text-netflix-red transition">
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setSelectedType(null)}
                      className="text-sm text-netflix-red hover:underline mb-2 block"
                    >
                      ← Back to options
                    </button>
                    
                    <div className="flex items-center gap-2 mb-4 text-white font-medium">
                      {contactOptions.find(o => o.id === selectedType)?.icon}
                      {contactOptions.find(o => o.id === selectedType)?.label}
                    </div>

                    <textarea
                      autoFocus
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        selectedType === 'review' ? "Tell us what you think..." :
                        selectedType === 'request' ? "What movie or show are you looking for?" :
                        "How can we help you?"
                      }
                      className="w-full bg-zinc-800 text-white rounded-xl p-4 outline-none border border-zinc-700 focus:border-netflix-red focus:ring-1 focus:ring-netflix-red resize-none transition"
                      required
                    />

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!message.trim()}
                    >
                      <FaWhatsapp size={20} />
                      Send via WhatsApp
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
