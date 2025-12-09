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
    const currentQueueSize = get().queue.length;
    console.log("🔄 [UPLOAD QUEUE] Adding to global queue:", {
      fileName: item.file.name,
      fieldId: item.fieldId,
      currentQueueSize,
      isCurrentlyUploading: get().isUploading,
    });

    set((state) => ({
      queue: [...state.queue, item],
    }));

    // If not currently uploading, start the upload
    const { isUploading } = get();
    if (!isUploading) {
      console.log("🚀 [UPLOAD QUEUE] Not currently uploading, starting next upload immediately");
      get().startNextUpload();
    } else {
      console.log("⏳ [UPLOAD QUEUE] Already uploading, file queued for later");
    }
  },

  startNextUpload: () => {
    const { queue, isUploading } = get();

    console.log("🎯 [UPLOAD QUEUE] startNextUpload called:", {
      queueLength: queue.length,
      isCurrentlyUploading: isUploading,
    });

    // Don't start if already uploading or queue is empty
    if (isUploading || queue.length === 0) {
      console.log("⏹️ [UPLOAD QUEUE] Cannot start next upload:", {
        reason: isUploading ? "Already uploading" : "Queue is empty",
      });
      return;
    }

    const [nextItem, ...remainingQueue] = queue;

    console.log("▶️ [UPLOAD QUEUE] Starting upload:", {
      fileName: nextItem.file.name,
      fieldId: nextItem.fieldId,
      remainingInQueue: remainingQueue.length,
    });

    set({
      isUploading: true,
      currentUpload: nextItem,
      queue: remainingQueue,
    });

    // Trigger the upload callback
    nextItem.onUpload(nextItem.file);
  },

  completeCurrentUpload: () => {
    const currentFile = get().currentUpload?.file.name;
    const remainingQueue = get().queue.length;

    console.log("✅ [UPLOAD QUEUE] Upload completed:", {
      completedFile: currentFile,
      remainingInQueue: remainingQueue,
    });

    set({
      isUploading: false,
      currentUpload: null,
    });

    // Start next upload if queue is not empty
    setTimeout(() => {
      console.log("⏭️ [UPLOAD QUEUE] Attempting to start next upload after delay");
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
