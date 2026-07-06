// Local storage helper functions

export const storage = {
  // Save draft
  saveDraft: (formId: string, content: string) => {
    try {
      localStorage.setItem(`draft_${formId}`, content);
      localStorage.setItem(`draft_${formId}_timestamp`, new Date().toISOString());
      return true;
    } catch (error) {
      console.error('Failed to save draft:', error);
      return false;
    }
  },

  // Load draft
  loadDraft: (formId: string): string | null => {
    try {
      return localStorage.getItem(`draft_${formId}`);
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  },

  // Save language preference
  saveLanguage: (language: string) => {
    localStorage.setItem('preferred_language', language);
  },

  // Load language preference
  loadLanguage: (): string | null => {
    return localStorage.getItem('preferred_language');
  },

  // Save user session
  saveUserSession: (userId: string, userData: any) => {
    localStorage.setItem('user_id', userId);
    localStorage.setItem('user_data', JSON.stringify(userData));
  },

  // Load user session
  loadUserSession: (): { userId: string | null; userData: any } => {
    const userId = localStorage.getItem('user_id');
    const userDataString = localStorage.getItem('user_data');
    const userData = userDataString ? JSON.parse(userDataString) : null;
    return { userId, userData };
  },

  // Clear user session
  clearUserSession: () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_data');
  },

  // Get all drafts
  getAllDrafts: (): Array<{ formId: string; content: string; timestamp: string }> => {
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('draft_') && !key.endsWith('_timestamp')) {
        const formId = key.replace('draft_', '');
        const content = localStorage.getItem(key) || '';
        const timestamp = localStorage.getItem(`${key}_timestamp`) || '';
        drafts.push({ formId, content, timestamp });
      }
    }
    return drafts;
  },

  // Save subscription status
  saveSubscription: (active: boolean, expiresAt: string) => {
    localStorage.setItem('sub_active', active ? 'true' : 'false');
    localStorage.setItem('sub_expires_at', expiresAt);
  },

  // Load subscription status
  loadSubscription: (): { active: boolean; expiresAt: string | null } => {
    const active = localStorage.getItem('sub_active') === 'true';
    const expiresAt = localStorage.getItem('sub_expires_at');
    if (active && expiresAt) {
      const expDate = new Date(expiresAt);
      if (new Date() > expDate) {
        localStorage.setItem('sub_active', 'false');
        return { active: false, expiresAt };
      }
    }
    return { active, expiresAt };
  }
};
