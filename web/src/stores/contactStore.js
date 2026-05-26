import { create } from 'zustand';
import { usersAPI } from '../services/api';

const useContactStore = create((set, get) => ({
  contacts: [],
  loading: false,

  fetchContacts: async () => {
    set({ loading: true });
    try {
      const { data } = await usersAPI.getContacts();
      set({ contacts: data.contacts || [], loading: false });
    } catch { set({ loading: false }); }
  },

  addContact: async (userId) => {
    await usersAPI.addContact({ contactUserId: userId });
    await get().fetchContacts();
  },

  removeContact: async (contactId) => {
    await usersAPI.removeContact(contactId);
    await get().fetchContacts();
  },
}));

export default useContactStore;
