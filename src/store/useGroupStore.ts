import { create } from 'zustand';

export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  members: string[];
  inviteCode: string;
  imageUri?: string;
  createdAt: any;
}

interface GroupState {
  groups: Group[];
  currentGroup: Group | null;
  setGroups: (groups: Group[]) => void;
  setCurrentGroup: (group: Group | null) => void;
  addGroup: (group: Group) => void;
}

export const useGroupStore = create<GroupState>((set) => ({
  groups: [],
  currentGroup: null,
  setGroups: (groups) => set({ groups }),
  setCurrentGroup: (group) => set({ currentGroup: group }),
  addGroup: (group) => set((state) => ({ groups: [...state.groups, group] })),
}));
