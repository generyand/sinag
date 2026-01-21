import { create } from "zustand";

interface UploadQueueItem {
  file: File;
  fieldId: string;
  assessmentId: number;
  indicatorId: number;
  onUpload: (file: File) => void;
}

interface UploadStore {
  isUploading: boolean;
  queue: UploadQueueItem[];
  currentUpload: UploadQueueItem | null;

  addToQueue: (item: UploadQueueItem) => void;
  startNextUpload: () => void;
  completeCurrentUpload: () => void;
  clearQueue: () => void;
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  isUploading: false,
  queue: [],
  currentUpload: null,

  addToQueue: (item) => {
    set((state) => ({
      queue: [...state.queue, item],
    }));

    // If not currently uploading, start the upload
    const { isUploading } = get();
    if (!isUploading) {
      get().startNextUpload();
    }
  },

  startNextUpload: () => {
    const { queue, isUploading } = get();

    // Don't start if already uploading or queue is empty
    if (isUploading || queue.length === 0) {
      return;
    }

    const [nextItem, ...remainingQueue] = queue;

    set({
      isUploading: true,
      currentUpload: nextItem,
      queue: remainingQueue,
    });

    // Trigger the upload callback
    nextItem.onUpload(nextItem.file);
  },

  completeCurrentUpload: () => {
    set({
      isUploading: false,
      currentUpload: null,
    });

    // Start next upload if queue is not empty
    setTimeout(() => {
      get().startNextUpload();
    }, 100);
  },

  clearQueue: () => {
    set({
      queue: [],
      isUploading: false,
      currentUpload: null,
    });
  },
}));
