import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Star,
  Phone,
  Mail,
  Building,
  Briefcase,
  Edit2,
  Trash2,
  X,
  Zap,
  Check,
  MessageCircle,
  RefreshCw
} from 'lucide-react';
import { Contact } from '../types';

interface ContactsListProps {
  contacts: Contact[];
  onCallContact: (contact: Contact) => void;
  onAddContact: (contact: Omit<Contact, 'id'>) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  initialPhoneToAdd?: string | null;
  onClearInitialPhone?: () => void;
  onOpenGoogleContactsModal?: () => void;
  googleContactsLinked?: boolean;
}

export const ContactsList: React.FC<ContactsListProps> = ({
  contacts,
  onCallContact,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onToggleFavorite,
  initialPhoneToAdd,
  onClearInitialPhone,
  onOpenGoogleContactsModal,
  googleContactsLinked = true,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(!!initialPhoneToAdd);

  // Form State for Add / Edit Contact
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: initialPhoneToAdd || '',
    email: '',
    company: '',
    role: '',
    isFavorite: false,
    speedDialKey: undefined as number | undefined,
    notes: '',
    isGoogleSynced: true,
  });

  // Open add modal if initial phone passed from Keypad
  React.useEffect(() => {
    if (initialPhoneToAdd) {
      setFormData((prev) => ({ ...prev, phone: initialPhoneToAdd }));
      setIsAddModalOpen(true);
    }
  }, [initialPhoneToAdd]);

  const filteredContacts = useMemo(() => {
    return contacts
      .filter((c) => {
        if (onlyFavorites && !c.isFavorite) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            (c.company && c.company.toLowerCase().includes(q)) ||
            (c.role && c.role.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, onlyFavorites, searchQuery]);

  // Group by first letter
  const groupedContacts = useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    filteredContacts.forEach((contact) => {
      const letter = contact.name.charAt(0).toUpperCase() || '#';
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(contact);
    });
    return groups;
  }, [filteredContacts]);

  const handleOpenAddModal = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      role: '',
      isFavorite: false,
      speedDialKey: undefined,
      notes: '',
      isGoogleSynced: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      company: contact.company || '',
      role: contact.role || '',
      isFavorite: contact.isFavorite,
      speedDialKey: contact.speedDialKey,
      notes: contact.notes || '',
      isGoogleSynced: contact.isGoogleSynced !== false,
    });
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    const bgColors = ['bg-blue-600', 'bg-indigo-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-500', 'bg-cyan-600'];
    const randomBg = bgColors[Math.floor(Math.random() * bgColors.length)];

    if (editingContact) {
      onUpdateContact({
        ...editingContact,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        company: formData.company.trim() || undefined,
        role: formData.role.trim() || undefined,
        isFavorite: formData.isFavorite,
        speedDialKey: formData.speedDialKey ? Number(formData.speedDialKey) : undefined,
        notes: formData.notes.trim() || undefined,
        isGoogleSynced: formData.isGoogleSynced,
      });
      if (selectedContact?.id === editingContact.id) {
        setSelectedContact({
          ...selectedContact,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          company: formData.company.trim() || undefined,
          role: formData.role.trim() || undefined,
          isFavorite: formData.isFavorite,
          speedDialKey: formData.speedDialKey ? Number(formData.speedDialKey) : undefined,
          notes: formData.notes.trim() || undefined,
          isGoogleSynced: formData.isGoogleSynced,
        });
      }
    } else {
      onAddContact({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        company: formData.company.trim() || undefined,
        role: formData.role.trim() || undefined,
        avatarBg: randomBg,
        isFavorite: formData.isFavorite,
        speedDialKey: formData.speedDialKey ? Number(formData.speedDialKey) : undefined,
        notes: formData.notes.trim() || undefined,
        isGoogleSynced: formData.isGoogleSynced,
      });
    }

    setIsAddModalOpen(false);
    if (onClearInitialPhone) onClearInitialPhone();
  };

  const getCleanWhatsappNumber = (phone: string) => {
    return phone.replace(/[^0-9]/g, '');
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-full px-4 py-2">
      {/* Google Contacts Link Status Banner */}
      <div className="mb-3 p-2.5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/80 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white border border-blue-200 flex items-center justify-center shadow-xs">
            <span className="text-xs font-black text-blue-600">G</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800">Google Contacts Link</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                {googleContactsLinked ? 'Synced' : 'Link Ready'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {googleContactsLinked ? 'Active Sync: corebiq@gmail.com' : 'Link your Google account'}
            </p>
          </div>
        </div>

        {onOpenGoogleContactsModal && (
          <button
            onClick={onOpenGoogleContactsModal}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Manage Link</span>
          </button>
        )}
      </div>

      {/* Top Bar: Search, Favorites Filter & Add Button */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="contacts-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name, role, company..."
              className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Contact Button */}
          <button
            id="add-new-contact-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow-blue-500/20 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Contact</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Favorite Filter Chips */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyFavorites(false)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              !onlyFavorites
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Contacts ({contacts.length})
          </button>
          <button
            onClick={() => setOnlyFavorites(true)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              onlyFavorites
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-white' : 'text-amber-500 fill-amber-500'}`} />
            Favorites ({contacts.filter((c) => c.isFavorite).length})
          </button>
        </div>
      </div>

      {/* Contacts List Grouped Alphabetically */}
      <div className="space-y-4 overflow-y-auto flex-1 pb-16">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No contacts found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try matching a different keyword or name' : 'Add a new contact using the button above'}
            </p>
          </div>
        ) : (
          Object.keys(groupedContacts)
            .sort()
            .map((letter) => (
              <div key={letter} className="space-y-1.5">
                {/* Section Letter Divider */}
                <div className="text-xs font-extrabold text-blue-700 bg-blue-50/70 border border-blue-100 px-3 py-0.5 rounded-lg inline-block">
                  {letter}
                </div>

                <div className="space-y-1">
                  {groupedContacts[letter].map((contact) => (
                    <div
                      key={contact.id}
                      className="group flex items-center justify-between p-3 bg-white hover:bg-blue-50/40 rounded-2xl border border-slate-200/80 hover:border-blue-200 transition-all shadow-xs"
                    >
                      {/* Left: Avatar + Info */}
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedContact(contact)}
                      >
                        <div
                          className={`w-10 h-10 rounded-full ${contact.avatarBg} text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0`}
                        >
                          {contact.name.charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {contact.name}
                            </span>
                            {contact.isGoogleSynced && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Google
                              </span>
                            )}
                            {contact.speedDialKey && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Zap className="w-2.5 h-2.5" />
                                Key {contact.speedDialKey}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5 truncate">
                            <span>{contact.phone}</span>
                            {contact.company && (
                              <>
                                <span>•</span>
                                <span className="font-sans text-slate-500 truncate">{contact.company}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Star Toggle & Call Action */}
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          onClick={() => onToggleFavorite(contact.id)}
                          title={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          className="p-2 text-slate-300 hover:text-amber-500 rounded-xl transition-colors cursor-pointer"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              contact.isFavorite ? 'text-amber-500 fill-amber-500' : ''
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => onCallContact(contact)}
                          title={`Call ${contact.name}`}
                          className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl border border-emerald-200 hover:border-emerald-300 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <Phone className="w-4 h-4 fill-emerald-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Contact Details Modal */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Contact Card
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    handleOpenEditModal(selectedContact);
                  }}
                  title="Edit contact"
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    onDeleteContact(selectedContact.id);
                    setSelectedContact(null);
                  }}
                  title="Delete contact"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hero Profile Info */}
            <div className="my-4 text-center">
              <div
                className={`w-20 h-20 rounded-full ${selectedContact.avatarBg} text-white flex items-center justify-center text-3xl font-extrabold mx-auto mb-2 shadow-md`}
              >
                {selectedContact.name.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{selectedContact.name}</h3>
              {selectedContact.role && (
                <p className="text-xs font-medium text-slate-600 mt-0.5">{selectedContact.role}</p>
              )}
              {selectedContact.company && (
                <p className="text-xs text-blue-600 font-semibold">{selectedContact.company}</p>
              )}
            </div>

            {/* Quick Actions Row: Call, WhatsApp, SMS */}
            <div className="grid grid-cols-3 gap-2 my-4">
              <button
                onClick={() => {
                  const contact = selectedContact;
                  setSelectedContact(null);
                  onCallContact(contact);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 fill-white" />
                <span>Call</span>
              </button>

              <a
                href={`https://wa.me/${getCleanWhatsappNumber(selectedContact.phone)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>

              <a
                href={`sms:${selectedContact.phone}`}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>SMS</span>
              </a>
            </div>

            {/* Detailed Properties */}
            <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono font-bold text-slate-900">{selectedContact.phone}</span>
              </div>

              {selectedContact.email && (
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-900 truncate max-w-[200px]">
                    {selectedContact.email}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Google Contacts:</span>
                <span className="font-semibold text-blue-700">
                  {selectedContact.isGoogleSynced ? 'Linked (corebiq@gmail.com)' : 'Local Only'}
                </span>
              </div>

              {selectedContact.speedDialKey && (
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Speed Dial Key:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Slot {selectedContact.speedDialKey}
                  </span>
                </div>
              )}

              {selectedContact.notes && (
                <div className="pt-1">
                  <span className="text-slate-500 block mb-0.5">Notes:</span>
                  <p className="text-slate-700 italic bg-white p-2 rounded-xl border border-slate-200">
                    {selectedContact.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingContact ? 'Edit Contact' : 'Create New Contact'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  if (onClearInitialPhone) onClearInitialPhone();
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="Tech Corp"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role / Title</label>
                  <input
                    type="text"
                    placeholder="Lead Engineer"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Speed Dial Slot (2-9)</label>
                  <select
                    value={formData.speedDialKey || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        speedDialKey: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">None</option>
                    {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <option key={num} value={num}>
                        Slot {num} (Long-press {num})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional contact notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="google-sync-checkbox"
                    checked={formData.isGoogleSynced}
                    onChange={(e) => setFormData({ ...formData, isGoogleSynced: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="google-sync-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Sync to Google Contacts account (corebiq@gmail.com)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="favorite-checkbox"
                    checked={formData.isFavorite}
                    onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="favorite-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Mark as Favorite (Star)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {editingContact ? 'Save Changes' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
