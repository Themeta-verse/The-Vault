import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import VaultExperience from "@/components/vault/VaultExperience";

export default function Home() {
  const { loading, isAuthenticated, error } = useAuth();

  if (loading) return <div className="vault-loading"><Loader2 className="spin" /><p>LOCATING THE VAULT</p></div>;

  if (!isAuthenticated) {
    return <main className="registration-gate">
      <div className="registration-gate__survey" aria-hidden="true">
        <div className="registration-gate__horizon" />
        <div className="registration-gate__datum"><i /><span /><b /></div>
        <div className="registration-gate__axis registration-gate__axis--north" />
        <div className="registration-gate__axis registration-gate__axis--east" />
      </div>
      <section className="registration-gate__record">
        <p className="eyebrow">UNCLAIMED RECORD · 01 / 00</p>
        <h1><span>THE</span>VAULT</h1>
        <p className="registration-gate__statement">An instrument for the things you notice. The chamber retains its routes, objects, and consequences for the person who enters.</p>
        {error && <p className="registration-gate__error">The record could not be confirmed. You may attempt registration again.</p>}
        <Button className="enter-button registration-gate__release" onClick={() => startLogin()}><LogIn /> Register your arrival</Button>
        <p className="registration-gate__provenance">Your discoveries, notes, and conversations remain scoped to your own record.</p>
      </section>
      <footer className="registration-gate__coordinates" aria-label="Vault entry information"><span>DATUM / 04</span><span>NO PRIOR ACCESS REQUIRED</span></footer>
    </main>;
  }

  return <VaultExperience />;
}
