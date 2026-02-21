import { useState, type FormEvent } from "react";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterPage({ onSwitch }: { onSwitch: () => void }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { register, loading, error } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      useAuthStore.setState({ error: "Passwords do not match" });
      return;
    }
    try {
      await register(username, password, displayName || undefined);
    } catch {
      // error is set in store
    }
  };

  return (
    <div className="flex h-full items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-bg-secondary rounded-lg p-8 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-2 text-center">Create an account</h1>
        <p className="text-text-muted text-center mb-6">
          Join ConnectHub
        </p>

        {error && (
          <div className="bg-danger/10 text-danger rounded p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <label className="block mb-4">
          <span className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
            Username
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full bg-bg-input text-text-primary rounded px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
            required
            minLength={2}
            maxLength={32}
            pattern="^[a-zA-Z0-9_]+$"
          />
        </label>

        <label className="block mb-4">
          <span className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
            Display Name
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full bg-bg-input text-text-primary rounded px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
            maxLength={64}
          />
        </label>

        <label className="block mb-4">
          <span className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full bg-bg-input text-text-primary rounded px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
            required
            minLength={8}
          />
        </label>

        <label className="block mb-6">
          <span className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
            Confirm Password
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full bg-bg-input text-text-primary rounded px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
            required
            minLength={8}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="mt-4 text-sm text-text-muted">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="text-accent hover:underline"
          >
            Log in
          </button>
        </p>
      </form>
    </div>
  );
}
