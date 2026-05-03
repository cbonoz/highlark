import { createRoot } from "react-dom/client";
import React, { useEffect, useState } from "react";
import { AnnotationCanvas } from "../components/AnnotationCanvas";
import { saveAnnotation, generateId, Drawing, Annotation } from "../storage";
import { downloadImage } from "../screenshot";

function AnnotateApp() {
  const [imageData, setImageData] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    // Get image data from IndexedDB with retry logic
    console.log('[Annotate] Component mounted, loading image from IndexedDB...');
    
    const loadImage = async (retryCount = 0) => {
      try {
        console.log(`[Annotate] Loading image (attempt ${retryCount + 1}/5)...`);
        setRetryAttempt(retryCount + 1);
        
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open('HighlarkDB', 3);
        
          req.onupgradeneeded = (event) => {
            console.log('[Annotate] Database upgrade needed');
            const database = (event.target as IDBOpenDBRequest).result;
            if (!database.objectStoreNames.contains('temp')) {
              database.createObjectStore('temp');
              console.log('[Annotate] Created temp store');
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
        
          req.onsuccess = () => {
            console.log('[Annotate] Database opened successfully');
            resolve(req.result);
          };
          req.onerror = () => {
            console.error('[Annotate] Database open error:', req.error);
            reject(req.error);
          };
        });
        
        console.log('[Annotate] Database connection established, getting screenshot from temp store...');
        const store = db.transaction(['temp'], 'readonly').objectStore('temp');
        const result = await new Promise<any>((resolve, reject) => {
          const req = store.get('screenshot');
          req.onsuccess = () => {
            console.log('[Annotate] Got result from store:', { 
              hasData: !!req.result?.data, 
              resultType: typeof req.result,
              resultKeys: req.result ? Object.keys(req.result) : [],
              dataSize: req.result?.data?.length,
              dataType: typeof req.result?.data,
              dataFirstChars: req.result?.data?.substring?.(0, 50)
            });
            resolve(req.result);
          };
          req.onerror = () => {
            console.error('[Annotate] Store get error:', req.error);
            reject(req.error);
          };
        });
        
        if (result?.data && result.data.length > 0) {
          console.log('[Annotate] Image loaded successfully, size:', result.data.length);
          // Validate it's a data URL
          if (typeof result.data === 'string' && (result.data.startsWith('data:') || result.data.startsWith('blob:'))) {
            console.log('[Annotate] Data URL is valid, setting image');
            setImageData(result.data);
            setLoading(false);
            setError("");
            
            // Clear the temporary data
            console.log('[Annotate] Clearing temporary storage...');
            const clearStore = db.transaction(['temp'], 'readwrite').objectStore('temp');
            clearStore.delete('screenshot');
          } else {
            console.error('[Annotate] Data is not a valid image URL:', result.data.substring(0, 50));
            setError('Invalid image format');
            setLoading(false);
          }
        } else if (retryCount < 4) {
          console.warn('[Annotate] No image data yet, retrying in 100ms...');
          db.close();
          setTimeout(() => loadImage(retryCount + 1), 100);
        } else {
          console.error('[Annotate] No image data after 5 attempts');
          setError('Timeout: Image data never arrived from popup');
          setLoading(false);
        }
        db.close();
      } catch (error) {
        console.error('[Annotate] Error loading image:', error);
        if (retryCount < 4) {
          console.warn('[Annotate] Retrying after error...');
          setTimeout(() => loadImage(retryCount + 1), 200);
        } else {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[Annotate] Failed after retries:', errorMsg);
          setError(`Failed to load image: ${errorMsg}`);
          setLoading(false);
        }
      }
    };
    
    loadImage();
  }, []);

  const handleSave = async (annotatedImageDataUrl: string, drawings: Drawing[]) => {
    try {
      console.log('[Annotate] Save clicked, creating annotation object');
      const annotation: Annotation = {
        id: generateId(),
        timestamp: Date.now(),
        originalImageData: imageData,
        annotatedImageData: annotatedImageDataUrl,
        drawings,
        title: `Screenshot ${new Date().toLocaleString()}`,
      };

      console.log('[Annotate] Saving annotation to database...');
      await saveAnnotation(annotation);
      console.log('[Annotate] Annotation saved successfully!');
      setSaved(true);

      // Show success message and close
      alert("Screenshot saved to gallery!");
      window.close();
    } catch (error) {
      console.error("[Annotate] Failed to save annotation:", error);
      alert("Failed to save annotation: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleCancel = () => {
    window.close();
  };

  if (error) {
    return (
      <div className="w-full h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
        <div className="bg-red-900 border-2 border-red-600 rounded-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-100 mb-4">❌ Error Loading Image</h2>
          <p className="text-red-100 mb-4">{error}</p>
          <p className="text-red-200 text-sm mb-4">Attempted {retryAttempt} times</p>
          <p className="text-red-200 text-sm">Check the console (F12) for detailed logs with [Annotate] prefix</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-screen bg-slate-900 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="inline-block mb-4">
            <div className="animate-spin h-12 w-12 border-4 border-slate-700 border-t-blue-500 rounded-full"></div>
          </div>
          <p className="text-slate-300 text-lg mb-2">Loading screenshot...</p>
          <p className="text-slate-500 text-sm">Attempt {retryAttempt}/5</p>
          <p className="text-slate-600 text-xs mt-4">If this takes too long, check F12 console for [Annotate] logs</p>
        </div>
      </div>
    );
  }

  if (!imageData) {
    return (
      <div className="w-full h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
        <div className="bg-yellow-900 border-2 border-yellow-600 rounded-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-yellow-100 mb-4">⚠️ No Image Data</h2>
          <p className="text-yellow-100 mb-4">The image data couldn't be found in the database.</p>
          <p className="text-yellow-200 text-sm">Try capturing another screenshot from the extension popup.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-900">
      <AnnotationCanvas
        imageDataUrl={imageData}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      {saved && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-slate-800 p-8 rounded-lg">
            <p className="text-slate-100">Screenshot saved!</p>
          </div>
        </div>
      )}
    </div>
  );
}

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);
  root.render(<AnnotateApp />);
}
