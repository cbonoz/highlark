export async function captureVisibleTab(): Promise<string> {
  try {
    console.log('[Screenshot] Capturing visible tab...');
    const canvas = await chrome.tabs.captureVisibleTab(undefined, {
      format: 'png',
      quality: 92,
    }) as unknown as string;
    
    if (!canvas) {
      throw new Error('captureVisibleTab returned empty');
    }
    
    console.log('[Screenshot] Capture successful, converting to blob...');
    // Convert data URL to blob and back to ensure it's in the right format
    const blob = dataUrlToBlob(canvas);
    const dataUrl = await blobToDataUrl(blob);
    
    console.log('[Screenshot] Conversion complete, size:', dataUrl.length);
    return dataUrl;
  } catch (error) {
    console.error('[Screenshot] Failed to capture:', error);
    throw error;
  }
}

export async function captureScreen(): Promise<string> {
  try {
    const canvas = await chrome.tabs.captureVisibleTab({
      format: 'png',
    });
    return canvas;
  } catch (error) {
    console.error('Failed to capture screen:', error);
    throw error;
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(';base64,');
    if (parts.length !== 2) {
      throw new Error('Invalid data URL format');
    }
    const bstr = atob(parts[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }

    return new Blob([u8arr], { type: 'image/png' });
  } catch (error) {
    console.error('[Screenshot] Error converting dataUrl to blob:', error);
    throw error;
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadImage(dataUrl: string, filename: string): Promise<void> {
  const blob = dataUrlToBlob(dataUrl);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function resizeImage(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function loadImageFromFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    let settled = false;
    const settle = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        settle(() => reject(new Error('No file selected')));
        return;
      }

      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          settle(() => resolve(dataUrl));
        };
        reader.onerror = () => settle(() => reject(new Error('Failed to read file')));
        reader.readAsDataURL(file);
      } catch (error) {
        settle(() => reject(error));
      }
    };

    input.onerror = () => settle(() => reject(new Error('Failed to open file picker')));
    
    // Handle case where user cancels file picker
    const handleCancel = () => {
      settle(() => reject(new Error('File selection cancelled')));
    };
    input.oncancel = handleCancel;
    
    // Fallback: detect if dialog was closed without selection via focus event
    const handleFocus = () => {
      setTimeout(() => {
        settle(() => reject(new Error('File selection cancelled')));
      }, 300);
    };
    window.addEventListener('focus', handleFocus, { once: true });

    input.click();
  });
}
