import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import VaultExperience from "@/components/vault/VaultExperience";

export default function Home() {
  const { loading, isAuthenticated, error } = useAuth();
  if (loading) return <div className="vault-loading"><Loader2 className="spin" /><p>LOCATING THE VAULT</p></div>;
  if (!isAuthenticated) return <main className="entry-gate"><div className="entry-gate__scene"><div className="entry-gate__ring" /><div className="entry-gate__monolith" /></div><section><p className="eyebrow">A LIVING DIGITAL WORLD</p><h1>THE<br />VAULT</h1><p>Enter a persistent environment that remembers what you discover. Your history belongs to your account alone.</p>{error && <p className="entry-gate__error">Authentication could not be confirmed. You can try entering again.</p>}<Button className="enter-button" onClick={() => startLogin()}><LogIn /> Enter your Vault</Button><small>Authentication protects your discoveries, history, notes, and conversations with ARIA.</small></section></main>;
  return <VaultExperience />;
}
