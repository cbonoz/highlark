import React, { useState, useEffect } from 'react';
import { captureVisibleTab, downloadImage, loadImageFromFile } from '../screenshot';
import { saveAnnotation, getAllAnnotations, deleteAnnotation, Annotation, generateId, createShare, getShareUrl } from '../storage';
import { AnnotationCanvas } from '../components/AnnotationCanvas';
import { Drawing } from '../storage';

export function App() {
  const [view, setView] = useState<'home' | 'canvas' | 'gallery' | 'editor'>('home');
  const [screenshotData, setScreenshotData] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [showShareMessage, setShowShareMessage] = useState(false);

  useEffect(() => {
    if (view === 'gallery') {
      loadAnnotations();
    }
  }, [view]);

  const loadAnnotations = async () => {
    try {
      const items = await getAllAnnotations();
      setAnnotations(items);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  const handleCaptureScreenshot = async () => {
    setLoading(true);
    try {
      console.log('[Popup] Starting capture...');
      const imageData = await captureVisibleTab();
      console.log('[Popup] Capture complete, size:', imageData.length);
      console.log('[Popup] Image data - first 100 chars:', imageData.substring(0, 100));
      setScreenshotData(imageData);

      // Store in IndexedDB temporarily
      console.log('[Popup] Storing image in IndexedDB...');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('HighlarkDB', 3);        
        req.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          if (!database.objectStoreNames.contains('temp')) {
            database.createObjectStore('temp');
            console.log('[Popup] Created temp store');
          }
          if (!database.objectStoreNames.contains('annotations')) {
            const store = database.createObjectStore('annotations', { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('shareId', 'shareId', { unique: true });
          }
          if (!database.objectStoreNames.contains('shares')) {
            database.createObjectStore('shares', { keyPath: 'shareId' });
          }
        };
                req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      
      const store = db.transaction(['temp'], 'readwrite').objectStore('temp');
      await new Promise<void>((resolve, reject) => {
        const putData = { data: imageData };
        console.log('[Popup] About to put to IndexedDB:', { dataSize: putData.data.length, dataType: typeof putData.data, firstChars: putData.data.substring(0, 50) });
        const req = store.put(putData, 'screenshot');
        req.onsuccess = () => {
          console.log('[Popup] IndexedDB write successful');
          resolve();
        };
        req.onerror = () => {
          console.error('[Popup] IndexedDB write failed:', req.error);
          reject(req.error);
        };
      });
      db.close();
      console.log('[Popup] Database closed after write');

      // Open annotation in a new window
      console.log('[Popup] Opening annotation window...');
      const annotationUrl = chrome.runtime.getURL('annotate/index.html');
      chrome.windows.create({
        url: annotationUrl,
        type: 'popup',
        width: 1000,
        height: 800,
      });

      // Close the popup
      window.close();
    } catch (error) {
      console.error('[Popup] Failed to capture screenshot:', error);
      setLoading(false);
      alert('Failed to capture screenshot: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleOpenImage = async () => {
    setLoading(true);
    try {
      console.log('[Popup] Opening image file...');
      const imageData = await loadImageFromFile();
      console.log('[Popup] Image loaded, size:', imageData.length);
      setScreenshotData(imageData);

      // Store in IndexedDB temporarily
      console.log('[Popup] Storing image in IndexedDB...');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('HighlarkDB', 3);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      
      const store = db.transaction(['temp'], 'readwrite').objectStore('temp');
      await new Promise<void>((resolve, reject) => {
        const req = store.put({ data: imageData }, 'screenshot');
        req.onsuccess = () => {
          console.log('[Popup] IndexedDB write complete');
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
      db.close();

      // Open annotation in a new window
      console.log('[Popup] Opening annotation window...');
      const annotationUrl = chrome.runtime.getURL('annotate/index.html');
      chrome.windows.create({
        url: annotationUrl,
        type: 'popup',
        width: 1000,
        height: 800,
      });

      // Close the popup
      window.close();
    } catch (error) {
      console.error('[Popup] Failed to open image:', error);
      setLoading(false);
      alert('Failed to open image file: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleSaveAnnotation = async (annotatedImageDataUrl: string, drawings: Drawing[]) => {
    try {
      const annotation: Annotation = {
        id: generateId(),
        timestamp: Date.now(),
        originalImageData: screenshotData,
        annotatedImageData: annotatedImageDataUrl,
        drawings,
        title: `Screenshot ${new Date().toLocaleString()}`,
      };

      await saveAnnotation(annotation);
      setView('home');
      setScreenshotData('');
    } catch (error) {
      console.error('Failed to save annotation:', error);
      alert('Failed to save annotation');
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    if (confirm('Delete this annotation?')) {
      try {
        await deleteAnnotation(id);
        loadAnnotations();
      } catch (error) {
        console.error('Failed to delete annotation:', error);
      }
    }
  };

  const handleDownloadAnnotation = (annotation: Annotation) => {
    const timestamp = new Date(annotation.timestamp).toISOString().slice(0, 10);
    downloadImage(annotation.annotatedImageData, `highlark-${timestamp}.png`);
  };

  const handleShareAnnotation = async (annotation: Annotation) => {
    try {
      let url = annotation.shareId ? getShareUrl(annotation.shareId) : '';

      if (!url) {
        const shareId = await createShare(annotation.id);
        url = getShareUrl(shareId);
      }

      setShareUrl(url);
      setShowShareMessage(true);

      // Copy to clipboard
      navigator.clipboard.writeText(url).catch(() => {
        console.log('Failed to copy to clipboard');
      });

      setTimeout(() => setShowShareMessage(false), 3000);
    } catch (error) {
      console.error('Failed to create share:', error);
      alert('Failed to create share link');
    }
  };

  if (view === 'canvas') {
    return (
      <AnnotationCanvas
        imageDataUrl={screenshotData}
        onSave={handleSaveAnnotation}
        onCancel={() => {
          setView('home');
          setScreenshotData('');
        }}
      />
    );
  }

  if (view === 'gallery') {
    return (
      <div className="w-96 max-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold">Gallery</h2>
          <button
            onClick={() => setView('home')}
            className="text-sm text-blue-400 hover:text-blue-300 mt-2"
          >
            ← Back
          </button>
        </div>

        {showShareMessage && (
          <div className="bg-green-600 text-white px-4 py-2 text-sm">
            ✓ Share link copied to clipboard!
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {annotations.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No annotations yet</p>
          ) : (
            annotations.map((annotation) => (
              <div
                key={annotation.id}
                className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition cursor-pointer"
                onClick={() => {
                  setSelectedAnnotation(annotation);
                  setView('editor');
                }}
              >
                <img
                  src={annotation.annotatedImageData}
                  alt={annotation.title}
                  className="w-full h-24 object-cover rounded mb-2"
                />
                <p className="text-sm font-semibold truncate">{annotation.title}</p>
                <p className="text-xs text-slate-400">
                  {new Date(annotation.timestamp).toLocaleString()}
                </p>
                <div className="flex gap-2 mt-2 text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadAnnotation(annotation);
                    }}
                    className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    Download
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareAnnotation(annotation);
                    }}
                    className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded"
                  >
                    Share
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnnotation(annotation.id);
                    }}
                    className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (view === 'editor' && selectedAnnotation) {
    return (
      <div className="w-96 max-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold truncate">{selectedAnnotation.title}</h2>
          <button
            onClick={() => {
              setView('gallery');
              setSelectedAnnotation(null);
            }}
            className="text-sm text-blue-400 hover:text-blue-300 mt-2"
          >
            ← Back to Gallery
          </button>
        </div>

        {showShareMessage && (
          <div className="bg-green-600 text-white px-4 py-2 text-sm">
            ✓ Share link copied to clipboard!
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <img
            src={selectedAnnotation.annotatedImageData}
            alt={selectedAnnotation.title}
            className="w-full"
          />
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-2 flex-col">
          <div className="flex gap-2">
            <button
              onClick={() => handleDownloadAnnotation(selectedAnnotation)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold text-sm"
            >
              Download
            </button>
            <button
              onClick={() => handleShareAnnotation(selectedAnnotation)}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold text-sm"
            >
              Share
            </button>
          </div>
          <button
            onClick={() => {
              handleDeleteAnnotation(selectedAnnotation.id);
              setView('gallery');
              setSelectedAnnotation(null);
            }}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="p-8 space-y-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Highlark</h1>
          <p className="text-slate-400 text-sm">The lightweight screenshot annotator</p>
        </div>

        <button
          onClick={handleCaptureScreenshot}
          disabled={loading}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 rounded-lg font-semibold transition transform hover:scale-105 active:scale-95"
        >
          {loading ? 'Capturing...' : '📸 Capture Screenshot'}
        </button>

        <button
          onClick={handleOpenImage}
          disabled={loading}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 rounded-lg font-semibold transition transform hover:scale-105 active:scale-95"
        >
          {loading ? 'Opening...' : '📂 Open Image'}
        </button>

        <button
          onClick={() => setView('gallery')}
          className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition"
        >
          🖼️ View Gallery ({annotations.length})
        </button>

        <div className="pt-4 border-t border-slate-700 space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Features:</p>
          <ul className="space-y-1">
            <li>✓ Capture any visible tab</li>
            <li>✓ Add arrows, text, shapes</li>
            <li>✓ Local storage - your privacy matters</li>
            <li>✓ Download & share annotations</li>
          </ul>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            Open source • Privacy first • No tracking
          </p>
        </div>
      </div>
    </div>
  );
}
