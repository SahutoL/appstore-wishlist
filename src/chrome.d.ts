declare namespace chrome {
  namespace runtime {
    interface LastError {
      message?: string;
    }

    interface MessageSender {
      url?: string;
      tab?: {
        id?: number;
        url?: string;
      };
    }

    interface InstalledDetails {
      reason: string;
    }

    interface Manifest {
      version: string;
      name: string;
    }

    const lastError: LastError | undefined;

    function sendMessage(
      message: unknown,
      callback?: (response: unknown) => void
    ): void;

    function openOptionsPage(callback?: () => void): void;

    function getManifest(): Manifest;

    const onInstalled: {
      addListener(listener: (details: InstalledDetails) => void): void;
    };

    const onMessage: {
      addListener(
        listener: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response: unknown) => void
        ) => boolean | void
      ): void;
    };
  }

  namespace storage {
    interface StorageArea {
      get(
        keys: string | string[] | Record<string, unknown> | null,
        callback: (items: Record<string, unknown>) => void
      ): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    }

    const local: StorageArea;
  }
}
