"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

type Todo = {
  id: string;
  user_id: string;
  title: string;
  is_complete: boolean;
  created_at: string;
};

const TODO_COLUMNS = "id, user_id, title, is_complete, created_at";

export default function Home() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});

  const loadTodos = useCallback(async () => {
    const { data, error: selectError } = await supabase
      .from("todos")
      .select(TODO_COLUMNS)
      .order("created_at", { ascending: false });
    if (selectError) throw new Error(selectError.message);
    setTodos(data ?? []);
  }, []);

  // On first load: establish an anonymous session if one is not already
  // persisted, then fetch this user's todos.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setPhase("loading");
        setError(null);

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw new Error(sessionError.message);

        if (!sessionData.session) {
          const { error: signInError } =
            await supabase.auth.signInAnonymously();
          if (signInError) throw new Error(signInError.message);
        }

        await loadTodos();
        if (active) setPhase("ready");
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setPhase("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [loadTodos]);

  const setPending = (id: string, value: boolean) =>
    setPendingIds((prev) => {
      const next = { ...prev };
      if (value) next[id] = true;
      else delete next[id];
      return next;
    });

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    setError(null);
    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      const userId = userData.user?.id;
      if (!userId) throw new Error("No active session.");

      const { data, error: insertError } = await supabase
        .from("todos")
        .insert({ title: trimmed, user_id: userId })
        .select(TODO_COLUMNS)
        .single();
      if (insertError) throw new Error(insertError.message);

      setTodos((prev) => (data ? [data, ...prev] : prev));
      setTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add todo.");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    setPending(todo.id, true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from("todos")
        .update({ is_complete: !todo.is_complete })
        .eq("id", todo.id)
        .select(TODO_COLUMNS)
        .single();
      if (updateError) throw new Error(updateError.message);
      setTodos((prev) => prev.map((t) => (t.id === todo.id && data ? data : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update todo.");
    } finally {
      setPending(todo.id, false);
    }
  };

  const handleDelete = async (todo: Todo) => {
    setPending(todo.id, true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("todos")
        .delete()
        .eq("id", todo.id);
      if (deleteError) throw new Error(deleteError.message);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete todo.");
    } finally {
      setPending(todo.id, false);
    }
  };

  return (
    <main className="container">
      <h1>Todos (beta)</h1>
      <p className="subtitle">
        Signed in anonymously. These todos are private to your session and
        enforced by Row Level Security.
      </p>

      <form className="add-form" onSubmit={handleAdd}>
        <label htmlFor="new-todo">New todo</label>
        <div className="add-row">
          <input
            id="new-todo"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            maxLength={500}
            autoComplete="off"
            disabled={phase === "error"}
          />
          <button
            type="submit"
            disabled={adding || title.trim().length === 0 || phase !== "ready"}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <section aria-live="polite" aria-busy={phase === "loading"}>
        {phase === "loading" ? <p>Loading your todos…</p> : null}

        {phase === "ready" && todos.length === 0 ? (
          <p>No todos yet. Add your first one above.</p>
        ) : null}

        {phase === "ready" && todos.length > 0 ? (
          <ul className="todo-list">
            {todos.map((todo) => {
              const pending = Boolean(pendingIds[todo.id]);
              return (
                <li key={todo.id} className="todo-item">
                  <input
                    type="checkbox"
                    id={`todo-${todo.id}`}
                    checked={todo.is_complete}
                    disabled={pending}
                    onChange={() => handleToggle(todo)}
                  />
                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={todo.is_complete ? "done" : undefined}
                  >
                    {todo.title}
                  </label>
                  <button
                    type="button"
                    className="delete"
                    onClick={() => handleDelete(todo)}
                    disabled={pending}
                    aria-label={`Delete "${todo.title}"`}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
