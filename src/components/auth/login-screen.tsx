"use client";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { useState } from "react";
import { ROLE_LABELS } from "@/lib/permissions";
import type { WorkspaceUser } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type AuthMode = "login" | "signup";

export function LoginScreen({
  users,
  theme,
  onToggleTheme,
  onAuthenticated,
}: {
  users: WorkspaceUser[];
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onAuthenticated: (user: WorkspaceUser) => void;
}) {
  const activeUsers = users.filter(
    (user) => user.active && user.id !== "unassigned",
  );
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState(activeUsers[0]?.email ?? "");
  const [password, setPassword] = useState("nimbus");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authenticate = async (
    endpoint: "/api/auth/login" | "/api/auth/signup",
    payload: Record<string, string>,
  ) => {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        user?: WorkspaceUser;
        error?: string;
      };
      if (!response.ok || !result.user) {
        throw new Error(result.error ?? "Unable to authenticate.");
      }
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to authenticate.",
      );
      setSubmitting(false);
    }
  };

  const submitLogin = (event: React.FormEvent) => {
    event.preventDefault();
    void authenticate("/api/auth/login", {
      email: email.trim(),
      password,
      remember: String(remember),
    });
  };

  const submitSignup = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Create a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setError("Accept the workspace terms to create your account.");
      return;
    }
    void authenticate("/api/auth/signup", {
      name: name.trim(),
      email: email.trim(),
      password,
    });
  };

  const changeMode = (value: string) => {
    const nextMode = value as AuthMode;
    setMode(nextMode);
    setError("");
    setShowPassword(false);
    if (nextMode === "signup") {
      setEmail("");
      setPassword("");
    } else {
      setEmail(activeUsers[0]?.email ?? "");
      setPassword("nimbus");
    }
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand">
          <span>
            <Layers3 size={22} strokeWidth={2.4} />
          </span>
          <strong>nimbus</strong>
        </div>
        <div className="login-story-copy">
          <span className="login-kicker">One place for your team&apos;s work</span>
          <h1>Move work forward, together.</h1>
          <p>
            Plan projects, assign clear ownership, and turn big outcomes into
            manageable subtasks.
          </p>
          <div className="login-benefits">
            <span>
              <CheckCircle2 size={18} /> Clear owners and shared responsibility
            </span>
            <span>
              <CheckCircle2 size={18} /> Tasks, subtasks, boards, and calendars
            </span>
            <span>
              <CheckCircle2 size={18} /> Secure, role-aware workspace access
            </span>
          </div>
        </div>
        <div className="login-social-proof">
          <div className="login-avatar-stack">
            {activeUsers.slice(0, 4).map((user) => (
              <span className={`avatar avatar-${user.tone}`} key={user.id}>
                {user.initials}
              </span>
            ))}
          </div>
          <span>
            <strong>Acme Studio</strong>
            <small>Join the team and start collaborating</small>
          </span>
        </div>
      </section>

      <section className="login-panel">
        <Button
          className="login-theme-toggle"
          variant="outline"
          size="icon"
          onClick={onToggleTheme}
          aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </Button>

        <Card className="login-card">
          <CardHeader className="login-card-header">
            <span className="login-mobile-mark">
              <Layers3 size={19} />
            </span>
            <span className="login-kicker">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </span>
            <CardTitle>
              {mode === "login"
                ? "Sign in to your workspace"
                : "Join Acme Studio"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Enter your account details or use a demo workspace profile."
                : "Create a member account and start working with your team."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={mode} onValueChange={changeMode}>
              <TabsList aria-label="Authentication">
                <TabsTrigger value="login">Log in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form className="auth-form" onSubmit={submitLogin}>
                  <div className="auth-field">
                    <Label htmlFor="login-email">Work email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError("");
                      }}
                      autoComplete="email"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <Label htmlFor="login-password">Password</Label>
                    <span className="password-field">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setError("");
                        }}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </div>
                  <div className="login-helper-row">
                    <span className="checkbox-label">
                      <Checkbox
                        id="remember"
                        checked={remember}
                        onCheckedChange={(checked) => setRemember(checked === true)}
                      />
                      <Label htmlFor="remember">Keep me signed in</Label>
                    </span>
                    <span>Demo password: nimbus</span>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button className="login-submit" size="lg" disabled={submitting}>
                    {submitting ? (
                      <>
                        <LoaderCircle className="auth-spinner" size={17} />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Continue to workspace <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </form>

                <div className="demo-divider">
                  <span>or choose a demo role</span>
                </div>
                <div className="demo-account-grid">
                  {activeUsers.map((user) => (
                    <Button
                      type="button"
                      variant="outline"
                      className={email === user.email ? "selected" : ""}
                      onClick={() => {
                        setEmail(user.email);
                        setPassword("nimbus");
                        setError("");
                      }}
                      key={user.id}
                    >
                      <span className={`avatar avatar-${user.tone}`}>
                        {user.initials}
                      </span>
                      <span>
                        <strong>{user.name}</strong>
                        <small>
                          {user.role === "admin" ? (
                            <ShieldCheck size={11} />
                          ) : (
                            <Users size={11} />
                          )}
                          {ROLE_LABELS[user.role]}
                        </small>
                      </span>
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <form className="auth-form signup-form" onSubmit={submitSignup}>
                  <div className="auth-field">
                    <Label htmlFor="signup-name">Full name</Label>
                    <Input
                      id="signup-name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        setError("");
                      }}
                      autoComplete="name"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <Label htmlFor="signup-email">Work email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError("");
                      }}
                      autoComplete="email"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <Label htmlFor="signup-password">Password</Label>
                    <span className="password-field">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setError("");
                        }}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </div>
                  <div className="auth-field">
                    <Label htmlFor="signup-confirm">Confirm password</Label>
                    <Input
                      id="signup-confirm"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setError("");
                      }}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <span className="checkbox-label signup-terms">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) =>
                        setAcceptedTerms(checked === true)
                      }
                    />
                    <Label htmlFor="terms">
                      I agree to the workspace terms and privacy policy.
                    </Label>
                  </span>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button className="login-submit" size="lg" disabled={submitting}>
                    {submitting ? (
                      <>
                        <LoaderCircle className="auth-spinner" size={17} />
                        Creating account…
                      </>
                    ) : (
                      <>
                        Create member account <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </form>
                <Alert className="signup-note">
                  <LockKeyhole size={16} />
                  <AlertDescription>
                    New accounts join as members. An admin can update roles later.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="auth-card-footer">
            <span>
              <LockKeyhole size={13} />
              Passwords are hashed and sessions stay in secure HttpOnly cookies.
            </span>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
