// store/knowledgeStore.ts
/**
 * 知识引擎 Zustand Store
 * 管理 libraries / sources / connectionProfiles
 */

import { create } from 'zustand';
import type { KnowledgeLibrary, KnowledgeSource, ConnectionProfile, LibraryDetail } from '@/types/knowledge';
import {
  listLibraries,
  createLibrary,
  updateLibrary,
  patchLibrary,
  getLibraryDetail,
  deleteLibrary,
  listSources,
  createSource,
  updateSource,
  checkSourceHealth,
  deleteSource,
  listConnectionProfiles,
  createConnectionProfile,
  patchConnectionProfile,
  deleteConnectionProfile,
} from '@/lib/knowledgeApi';

interface KnowledgeStoreState {
  // Libraries
  libraries: KnowledgeLibrary[];
  librariesLoading: boolean;
  librariesError: string | null;

  // Library Detail
  libraryDetail: LibraryDetail | null;
  libraryDetailLoading: boolean;
  libraryDetailError: string | null;

  // Sources
  sources: KnowledgeSource[];
  sourcesLoading: boolean;
  sourcesError: string | null;

  // Connection Profiles
  connectionProfiles: ConnectionProfile[];
  profilesLoading: boolean;
  profilesError: string | null;

  // Actions - Libraries
  fetchLibraries: () => Promise<void>;
  addLibrary: (data: { name: string; description?: string }) => Promise<KnowledgeLibrary>;
  editLibrary: (id: string, data: { name?: string; description?: string }) => Promise<void>;
  toggleLibraryStatus: (id: string, status: 'active' | 'disabled') => Promise<void>;
  fetchLibraryDetail: (id: string) => Promise<LibraryDetail>;
  removeLibrary: (id: string, force?: boolean) => Promise<void>;

  // Actions - Sources
  fetchSources: (libraryId?: string, connectionProfileId?: string) => Promise<void>;
  addSource: (data: { name: string; backend_type: string; library_id?: string; connection_profile_id?: string; description?: string }) => Promise<KnowledgeSource>;
  editSource: (id: string, data: Record<string, unknown>) => Promise<void>;
  runHealthCheck: (sourceId: string) => Promise<void>;
  removeSource: (id: string) => Promise<void>;

  // Actions - Connection Profiles
  fetchConnectionProfiles: () => Promise<void>;
  addConnectionProfile: (data: { name: string; backend_type: string; connection_params?: Record<string, unknown>; description?: string }) => Promise<ConnectionProfile>;
  editConnectionProfile: (id: string, data: { name?: string; description?: string; connection_params?: Record<string, unknown> }) => Promise<void>;
  removeConnectionProfile: (id: string, force?: boolean) => Promise<void>;
}

export const useKnowledgeStore = create<KnowledgeStoreState>((set) => ({
  libraries: [],
  librariesLoading: false,
  librariesError: null,

  libraryDetail: null,
  libraryDetailLoading: false,
  libraryDetailError: null,

  sources: [],
  sourcesLoading: false,
  sourcesError: null,

  connectionProfiles: [],
  profilesLoading: false,
  profilesError: null,

  // Libraries
  fetchLibraries: async () => {
    set({ librariesLoading: true, librariesError: null });
    try {
      const libs = await listLibraries();
      set({ libraries: libs, librariesLoading: false });
    } catch (err) {
      set({ librariesLoading: false, librariesError: err instanceof Error ? err.message : '加载知识库失败' });
    }
  },

  addLibrary: async (data) => {
    const lib = await createLibrary(data);
    set((s) => ({ libraries: [...s.libraries, lib] }));
    return lib;
  },

  editLibrary: async (id, data) => {
    const lib = await updateLibrary(id, data);
    set((s) => ({ libraries: s.libraries.map((l) => (l.library_id === id ? lib : l)) }));
  },

  toggleLibraryStatus: async (id, status) => {
    const lib = await patchLibrary(id, { status });
    set((s) => ({ libraries: s.libraries.map((l) => (l.library_id === id ? lib : l)) }));
  },

  fetchLibraryDetail: async (id) => {
    set({ libraryDetailLoading: true, libraryDetailError: null });
    try {
      const detail = await getLibraryDetail(id);
      set({ libraryDetail: detail, libraryDetailLoading: false });
      return detail;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载知识库详情失败';
      set({ libraryDetailLoading: false, libraryDetailError: msg });
      throw err;
    }
  },

  removeLibrary: async (id, force = false) => {
    await deleteLibrary(id, force);
    set((s) => ({
      libraries: s.libraries.filter((l) => l.library_id !== id),
      libraryDetail: s.libraryDetail?.library_id === id ? null : s.libraryDetail,
    }));
  },

  // Sources
  fetchSources: async (libraryId, connectionProfileId) => {
    set({ sourcesLoading: true, sourcesError: null });
    try {
      const srcs = await listSources(libraryId, connectionProfileId);
      set({ sources: srcs, sourcesLoading: false });
    } catch (err) {
      set({ sourcesLoading: false, sourcesError: err instanceof Error ? err.message : '加载数据源失败' });
    }
  },

  addSource: async (data) => {
    const src = await createSource(data);
    set((s) => ({ sources: [...s.sources, src] }));
    return src;
  },

  editSource: async (id, data) => {
    const src = await updateSource(id, data);
    set((s) => ({ sources: s.sources.map((sr) => (sr.source_id === id ? src : sr)) }));
  },

  runHealthCheck: async (sourceId) => {
    const result = await checkSourceHealth(sourceId);
    set((s) => ({
      sources: s.sources.map((sr) =>
        sr.source_id === sourceId
          ? { ...sr, health_status: result.health_status as KnowledgeSource['health_status'], last_health_check: new Date().toISOString() }
          : sr,
      ),
    }));
  },

  removeSource: async (id) => {
    await deleteSource(id);
    set((s) => ({ sources: s.sources.filter((sr) => sr.source_id !== id) }));
  },

  // Connection Profiles
  fetchConnectionProfiles: async () => {
    set({ profilesLoading: true, profilesError: null });
    try {
      const profs = await listConnectionProfiles();
      set({ connectionProfiles: profs, profilesLoading: false });
    } catch (err) {
      set({ profilesLoading: false, profilesError: err instanceof Error ? err.message : '加载连接配置失败' });
    }
  },

  addConnectionProfile: async (data) => {
    const prof = await createConnectionProfile(data);
    set((s) => ({ connectionProfiles: [...s.connectionProfiles, prof] }));
    return prof;
  },

  editConnectionProfile: async (id, data) => {
    const prof = await patchConnectionProfile(id, data);
    set((s) => ({ connectionProfiles: s.connectionProfiles.map((p) => (p.profile_id === id ? prof : p)) }));
  },

  removeConnectionProfile: async (id, force = false) => {
    await deleteConnectionProfile(id, force);
    set((s) => ({ connectionProfiles: s.connectionProfiles.filter((p) => p.profile_id !== id) }));
  },
}));
