import { createRoot } from "react-dom/client";
import React, { useEffect, useState } from "react";
import { AnnotationCanvas } from "./components/AnnotationCanvas";
import { saveAnnotation, generateId, Drawing, Annotation } from "./storage";
import { downloadImage } from "./screenshot";

function AnnotateApp() {
  const [imageData, setImageData] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Get image data from URL parameter
    const params = new URLSearchParams(window.location.search);
    const data = params.get("imageData");
    if (data) {
      setImageData(decodeURIComponent(data));
    }
  }, []);

  const handleSave = async (annotatedImageDataUrl: string, drawings: Drawing[]) => {
    try {
      const annotation: Annotation = {
        id: generateId(),
        timestamp: Date.now(),
        originalImageData: imageData,
        annotatedImageData: annotatedImageDataUrl,
        drawings,
        title: `Screenshot ${new Date().toLocaleString()}`,
      };

      await saveAnnotation(annotation);
      setSaved(true);

      // Show success message and close
      alert("Screenshot saved to Downloads!");
      window.close();
    } catch (error) {
      console.error("Failed to save annotation:", error);
      alert("Failed to save annotation");
    }
  };

  const handleCancel = () => {
    window.close();
  };

  if (!imageData) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Loading screenshot...</p>
      </div>
    );
  }

  return (
    <AnnotationCanvas
      imageDataUrl={imageData}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);
  root.render(<AnnotateApp />);
}
