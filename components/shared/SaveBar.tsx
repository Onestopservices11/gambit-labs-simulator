'use client';

import { useState, useEffect } from 'react';
import { Save, RotateCcw, CheckCircle2 } from 'lucide-react';

export default function SaveBar({
  isDirty,
  onSave,
  onDiscard,
}: {
  isDirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isDirty) return;
    setSaved(false);
  }, [isDirty]);

  function handleSave() {
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!isDirty && !saved) return null;

  return (
    <div className="fixed bottom-0 left-64 right-0 z-40 border-t border-slate-200 bg-white shadow-lg px-8 py-3 flex items-center justify-between">
      {saved ? (
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-semibold">Guardado com sucesso — todas as páginas estão atualizadas.</span>
        </div>
      ) : (
        <p className="text-sm text-amber-700 font-medium">Tens alterações não guardadas.</p>
      )}
      {!saved && (
        <div className="flex gap-3">
          <button
            onClick={onDiscard}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Descartar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar Alterações
          </button>
        </div>
      )}
    </div>
  );
}
