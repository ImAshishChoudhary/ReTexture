import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Zustand store for editor state management
 * Replaces Redux Toolkit + Redux Persist with a simpler, more efficient solution
 */
export const useEditorStore = create(
  persist(
    (set, get) => ({
      // ============== STATE ==============
      
      // Navigation
      path: "banner",
      collapsed: {
        parent: false,
        child: true,
      },
      
      // Canvas
      canvasSize: { w: 1080, h: 1080 },
      zoom: 1,
      activeIndex: 0,
      selectedUniqueId: null,
      editorPages: [{ id: 1, children: [], background: "#ffffff" }],
      
      // UI
      popup: false,
      
      // Resources
      fontList: [],
      uploadsPhotos: [],
      generatedImages: [],
      savedTemplates: [],


      // ============== ACTIONS ==============
      
      // Navigation actions
      setPath: (path) => set({ path }),
      
      setCollapsed: ({ parent, child }) => set((state) => ({
        collapsed: { 
          parent: parent ?? state.collapsed.parent, 
          child: child ?? state.collapsed.child 
        }
      })),
      
      // Canvas actions
      setZoom: (zoom) => set({ zoom }),
      
      setActiveIndex: (activeIndex) => set({ activeIndex }),
      
      setSelectedUniqueId: (selectedUniqueId) => set({ selectedUniqueId }),
      
      setEditorPages: (editorPages) => set({ editorPages }),
      
      setCanvasSize: (canvasSize) => set({ canvasSize }),
      
      // UI actions
      setPopUp: (popup) => set({ popup }),
      
      // Resource actions
      setFontList: (fontList) => set({ fontList }),
      
      setUploadsPhotos: (uploadsPhotos) => set({ uploadsPhotos }),
      
      setGeneratedImages: (generatedImages) => set({ generatedImages }),
      
      setSaveTemplate: (template) => set((state) => ({
        savedTemplates: [...state.savedTemplates, template]
      })),
      
      deleteTemplate: (templateId) => set((state) => ({
        savedTemplates: state.savedTemplates.filter(
          (tpl) => String(tpl?.id) !== String(templateId)
        )
      })),


      // ============== UTILITY ACTIONS ==============
      
      // Reset to initial state (useful for testing)
      reset: () => set({
        path: "banner",
        collapsed: { parent: false, child: true },
        canvasSize: { w: 1080, h: 1080 },
        zoom: 1,
        activeIndex: 0,
        selectedUniqueId: null,
        editorPages: [{ id: 1, children: [], background: "#ffffff" }],
        popup: false,
        fontList: [],
        uploadsPhotos: [],
        generatedImages: [],
        savedTemplates: [],

      }),
    }),
    {
      name: 'editor-settings', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist small settings to avoid quota issues
      // Large data like editorPages, uploadsPhotos, etc. are NOT persisted
      partialize: (state) => ({
        path: state.path,
        zoom: state.zoom,
        canvasSize: state.canvasSize,
        collapsed: state.collapsed,
      }),
    }
  )
);

// Export individual selectors for convenience (optional)
export const useEditorPath = () => useEditorStore((state) => state.path);
export const useEditorZoom = () => useEditorStore((state) => state.zoom);
export const useEditorPages = () => useEditorStore((state) => state.editorPages);
export const useSelectedId = () => useEditorStore((state) => state.selectedUniqueId);
