"use client";

import { ComicButton } from "@/components/ComicButton";
import { Icon } from "@/components/Icon";
import { useFamilyStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GuidesPage() {
  const router = useRouter();
  const guides = useFamilyStore((s) => s.guides);
  const addGuide = useFamilyStore((s) => s.addGuide);
  const updateGuide = useFamilyStore((s) => s.updateGuide);
  const removeGuide = useFamilyStore((s) => s.removeGuide);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

  function startEdit(id: string, title: string, content: string) {
    setEditingId(id);
    setCreating(false);
    setDraftTitle(title);
    setDraftContent(content);
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setDraftTitle("");
    setDraftContent("");
  }

  function cancel() {
    setEditingId(null);
    setCreating(false);
  }

  function save() {
    const title = draftTitle.trim();
    if (!title) return;
    if (creating) {
      addGuide(title, draftContent);
    } else if (editingId) {
      updateGuide(editingId, { title, content: draftContent });
    }
    cancel();
  }

  const sorted = [...guides].sort((a, b) => a.title.localeCompare(b.title, "ru"));
  const editorOpen = creating || editingId !== null;

  return (
    <>
      <header className="flex items-center gap-3 px-4 pt-6">
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          className="rounded-full border-3 border-ink bg-white p-2 shadow-pop-sm"
        >
          <Icon name="back" className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl uppercase">Инструкции</h1>
      </header>

      <main className="flex-1 space-y-3 px-4 pb-8 pt-4">
        <p className="px-1 text-xs font-semibold text-ink/50">
          Памятки на все случаи — как правильно делать то или это. Их может завести и поправить любой член семьи.
        </p>

        {editorOpen && (
          <div className="space-y-2 rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm">
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Название, например «Чек-лист по кухне»"
              className="w-full rounded-xl border-3 border-ink px-3 py-2 font-semibold outline-none"
            />
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Текст инструкции..."
              rows={12}
              className="w-full rounded-xl border-3 border-ink px-3 py-2 font-semibold outline-none"
            />
            <div className="flex gap-2">
              <ComicButton variant="mint" className="flex-1" disabled={!draftTitle.trim()} onClick={save}>
                Сохранить
              </ComicButton>
              <ComicButton variant="outline" className="flex-1" onClick={cancel}>
                Отмена
              </ComicButton>
            </div>
          </div>
        )}

        {!editorOpen && (
          <ComicButton variant="pink" className="w-full" onClick={startCreate}>
            + Добавить инструкцию
          </ComicButton>
        )}

        <div className="space-y-2.5 pt-1">
          {sorted.map((g) => (
            <div key={g.id} className="rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-sm uppercase">{g.title}</h2>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => startEdit(g.id, g.title, g.content)}
                    aria-label={`Править «${g.title}»`}
                    className="rounded-full border-2 border-ink px-2 py-1 text-[11px] font-bold uppercase"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => confirm(`Удалить инструкцию «${g.title}»?`) && removeGuide(g.id)}
                    className="rounded-full border-2 border-ink px-2 py-1 text-[11px] font-bold uppercase text-pink-deep"
                  >
                    Удалить
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-ink/70">{g.content}</p>
            </div>
          ))}
          {sorted.length === 0 && !editorOpen && (
            <p className="rounded-2xl border-3 border-dashed border-ink/30 p-4 text-center text-sm font-semibold text-ink/50">
              Инструкций пока нет — добавьте первую.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
