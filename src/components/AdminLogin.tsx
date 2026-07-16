import { useState } from "react";
import { sendMagicLink, signOut } from "../lib/auth";

type Status = "idle" | "sending" | "sent" | "error";

interface AdminLoginProps {
  isAdmin: boolean;
}

export default function AdminLogin({ isAdmin }: AdminLoginProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("sending");
    try {
      await sendMagicLink(trimmed);
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  if (isAdmin) {
    return (
      <div className="tk-admin-badge">
        <span className="tk-hint">Signed in as organizer</span>
        <button className="tk-btn ghost tk-btn--sm" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="tk-btn ghost tk-btn--sm" onClick={() => setOpen(true)}>
        Organizer sign in
      </button>
    );
  }

  if (status === "sent") {
    return <span className="tk-hint">Check your email for a sign-in link.</span>;
  }

  return (
    <div className="tk-admin-login">
      <input
        className="tk-admin-email"
        type="email"
        placeholder="organizer@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <button className="tk-btn tk-btn--sm" disabled={status === "sending"} onClick={submit}>
        {status === "sending" ? "Sending…" : "Send link"}
      </button>
      <button className="tk-btn ghost tk-btn--sm" onClick={() => setOpen(false)}>
        Cancel
      </button>
      {status === "error" && <span className="tk-hint tk-error">{errorMsg}</span>}
    </div>
  );
}
