import { createRoot } from "react-dom/client";
import React from "react";

function Options() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Highlark Settings</h1>
        <p className="text-slate-400 mb-8">Configure your screenshot annotator</p>

        <div className="space-y-6">
          <section className="bg-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">About Highlark</h2>
            <p className="text-slate-300 mb-2">
              Highlark is a lightweight, open-source screenshot annotator. Capture any visible tab, add annotations with arrows, text, and shapes, then save or share your markup.
            </p>
            <p className="text-slate-400 text-sm">
              Version: 0.1.0
            </p>
          </section>

          <section className="bg-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Privacy</h2>
            <ul className="space-y-2 text-slate-300">
              <li>✓ All data stored locally in your browser</li>
              <li>✓ No tracking or analytics</li>
              <li>✓ No connection to external servers</li>
              <li>✓ Your screenshots are yours alone</li>
            </ul>
          </section>

          <section className="bg-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Features</h2>
            <ul className="space-y-2 text-slate-300">
              <li>📸 Screenshot capture from any tab</li>
              <li>🎨 Drawing tools: arrows, text, shapes (rectangle, circle, line)</li>
              <li>🎯 Color picker and font size adjustment</li>
              <li>💾 Local storage gallery</li>
              <li>📥 Download annotations as PNG</li>
              <li>🔗 Generate shareable links for annotations</li>
            </ul>
          </section>

          <section className="bg-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-2 text-slate-300 text-sm">
              <p><span className="font-mono bg-slate-600 px-2 py-1 rounded">Enter</span> - Confirm text input</p>
              <p><span className="font-mono bg-slate-600 px-2 py-1 rounded">Escape</span> - Cancel text input</p>
            </div>
          </section>

          <section className="bg-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Storage Information</h2>
            <p className="text-slate-300 mb-4">
              Highlark uses IndexedDB to store your annotations locally. This means:
            </p>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>• Data persists even when you close your browser</li>
              <li>• Storage space varies by browser (typically 50MB+)</li>
              <li>• You can clear all data by going to Chrome Settings → Privacy → Clear browsing data</li>
            </ul>
          </section>

          <section className="bg-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Support & Feedback</h2>
            <p className="text-slate-300 mb-4">
              Found a bug or have a feature request? Highlark is open source!
            </p>
            <a
              href="https://github.com/cbonoz/highlark"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
            >
              View on GitHub
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);
  root.render(<Options />);
}
