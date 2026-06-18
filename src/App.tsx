import { useEffect, useState } from "react";
import api from "./api";
import type { TodoItem } from "./api";
import "./App.css";

type AuthMode = "login" | "register";

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const canSubmit = email.trim() !== "" && password.trim().length >= 6;

  const authLabel = mode === "login" ? "Login" : "Register";
  const toggleLabel = mode === "login" ? "Create account" : "Already have an account?";

  const getTodos = async () => {
    setLoading(true);
    try {
      const items = await api.fetchTodos();
      setTodos(items);
      setError(null);
      setIsAuthenticated(true);
    } catch (err) {
      setError("Unable to load todos. Please login again.");
      api.logout();
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = api.getAccessToken();
    if (token) {
      getTodos();
    }
  }, []);

  const handleAuth = async () => {
    if (!canSubmit) return;
    setAuthenticating(true);
    setError(null);

    try {
      if (mode === "login") {
        await api.login(email, password);
      } else {
        await api.register(email, password);
      }
      setEmail("");
      setPassword("");
      await getTodos();
    } catch (err) {
      setError(api.getErrorMessage(err) || "Authentication failed.");
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setTodos([]);
    setIsAuthenticated(false);
  };

  const handleAddTodo = async () => {
    if (!title.trim()) {
      setError("Todo title is required.");
      return;
    }
    setLoading(true);
    try {
      const todo = await api.createTodo({ title, description });
      setTodos((current) => [todo, ...current]);
      setTitle("");
      setDescription("");
      setError(null);
    } catch (err) {
      setError(api.getErrorMessage(err) || "Failed to add todo.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTodo = async (id: number, payload: Partial<TodoItem>) => {
    setLoading(true);
    try {
      const updated = await api.updateTodo(id, payload);
      setTodos((current) => current.map((todo) => (todo.id === id ? updated : todo)));
      setError(null);
    } catch (err) {
      setError(api.getErrorMessage(err) || "Failed to update todo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    setLoading(true);
    try {
      await api.deleteTodo(id);
      setTodos((current) => current.filter((todo) => todo.id !== id));
      setError(null);
    } catch (err) {
      setError(api.getErrorMessage(err) || "Failed to delete todo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>TODO Studio</span>
          <small>Auth + refresh token example</small>
        </div>
        {isAuthenticated && (
          <button className="button button--ghost" onClick={handleLogout}>
            Logout
          </button>
        )}
      </header>

      <main className="page-grid">
        <section className="panel panel--hero">
          <div>
            <p className="eyebrow">Elegant task workspace</p>
            <h1>Keep your todos in sync with a secure backend.</h1>
            <p className="lead">
              Log in, create tasks, and let the UI refresh your access token automatically.
            </p>
          </div>
        </section>

        {!isAuthenticated ? (
          <section className="panel panel--auth">
            <div className="form-shell">
              <h2>{authLabel}</h2>
              <p className="form-hint">
                Use any working email and password. Password must be at least 6 characters.
              </p>

              <label>
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" />
              </label>
              <label>
                Password
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" />
              </label>

              {error && <div className="toast toast--error">{error}</div>}

              <button className="button button--primary" onClick={handleAuth} disabled={authenticating || !canSubmit}>
                {authenticating ? "Working..." : authLabel}
              </button>

              <button className="button button--ghost" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}> 
                {toggleLabel}
              </button>
            </div>
          </section>
        ) : (
          <section className="panel panel--todo">
            <div className="panel-header">
              <div>
                <h2>Your todo workflow</h2>
                <p>Manage tasks with instant token refresh and a modern UI.</p>
              </div>
            </div>

            <div className="card card--input">
              <div className="stacked-group">
                <label>
                  Task title
                  <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Write a title" />
                </label>
                <label>
                  Description
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add helpful context" />
                </label>
              </div>
              <div className="form-actions">
                <button className="button button--primary" onClick={handleAddTodo} disabled={loading || title.trim().length === 0}>
                  Add task
                </button>
              </div>
            </div>

            {error && <div className="toast toast--error">{error}</div>}

            <div className="todo-list">
              {todos.length === 0 && <div className="empty-state">No tasks yet. Add your first todo.</div>}
              {todos.map((todo) => (
                <div key={todo.id} className="todo-card">
                  <div className="todo-meta">
                    <div>
                      <h3>{todo.title}</h3>
                      <p>{todo.description || "No description"}</p>
                    </div>
                    <div className="todo-actions">
                      <button className="button button--ghost" onClick={() => handleUpdateTodo(todo.id, { completed: !todo.completed })}>
                        {todo.completed ? "Mark as undone" : "Complete"}
                      </button>
                      <button className="button button--danger" onClick={() => handleDeleteTodo(todo.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="todo-badge">{todo.completed ? "Completed" : "Open"}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
