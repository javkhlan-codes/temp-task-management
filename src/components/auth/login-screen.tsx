"use client";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
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
        throw new Error(result.error ?? "Нэвтрэх хүсэлтийг боловсруулах боломжгүй.");
      }
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Нэвтрэх хүсэлтийг боловсруулах боломжгүй.",
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
      setError("Нууц үг хамгийн багадаа 8 тэмдэгттэй байна.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Нууц үгнүүд хоорондоо тохирохгүй байна.");
      return;
    }
    if (!acceptedTerms) {
      setError("Бүртгэл үүсгэхийн тулд үйлчилгээний нөхцөлийг зөвшөөрнө үү.");
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
          <span aria-hidden="true">
            <img src="/pro-team-logo.png" alt="" />
          </span>
          <strong>Pro Team</strong>
        </div>
        <div className="login-story-copy">
          <span className="login-kicker">Танай багийн ажлын нэгдсэн орон зай</span>
          <h1>Ажлаа хамтдаа урагшлуул.</h1>
          <p>
            Төслөө төлөвлөж, хариуцагчаа тодорхой болгож, том зорилгыг
            хэрэгжихүйц дэд ажлуудад хуваарилаарай.
          </p>
          <div className="login-benefits">
            <span>
              <CheckCircle2 size={18} /> Тодорхой эзэн, хамтын хариуцлага
            </span>
            <span>
              <CheckCircle2 size={18} /> Таск, дэд таск, самбар, календарь
            </span>
            <span>
              <CheckCircle2 size={18} /> Рольд суурилсан аюулгүй хандалт
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
            <small>Багтаа нэгдэж, хамтран ажиллаж эхлээрэй</small>
          </span>
        </div>
      </section>

      <section className="login-panel">
        <Button
          className="login-theme-toggle"
          variant="outline"
          size="icon"
          onClick={onToggleTheme}
          aria-label={`${theme === "light" ? "Бараан" : "Цайвар"} горим ашиглах`}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </Button>

        <Card className="login-card">
          <CardHeader className="login-card-header">
            <span className="login-mobile-mark" aria-hidden="true">
              <img src="/pro-team-logo.png" alt="" />
            </span>
            <span className="login-kicker">
              {mode === "login" ? "Тавтай морил" : "Шинэ бүртгэл"}
            </span>
            <CardTitle>
              {mode === "login"
                ? "Workspace-даа нэвтрэх"
                : "Acme Studio-д нэгдэх"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Бүртгэлийн мэдээллээ оруулах эсвэл demo эрх сонгоно уу."
                : "Гишүүний бүртгэл үүсгээд багтайгаа ажиллаж эхлээрэй."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={mode} onValueChange={changeMode}>
              <TabsList aria-label="Нэвтрэлт">
                <TabsTrigger value="login">Нэвтрэх</TabsTrigger>
                <TabsTrigger value="signup">Бүртгүүлэх</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form className="auth-form" onSubmit={submitLogin}>
                  <div className="auth-field">
                    <Label htmlFor="login-email">Ажлын и-мэйл</Label>
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
                    <Label htmlFor="login-password">Нууц үг</Label>
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
                        aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
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
                      <Label htmlFor="remember">Нэвтэрсэн хэвээр үлдэх</Label>
                    </span>
                    <span>Demo нууц үг: nimbus</span>
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
                        Нэвтэрч байна…
                      </>
                    ) : (
                      <>
                        Workspace руу орох <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </form>

                <div className="demo-divider">
                  <span>эсвэл demo эрх сонгох</span>
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
                    <Label htmlFor="signup-name">Овог нэр</Label>
                    <Input
                      id="signup-name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        setError("");
                      }}
                      autoComplete="name"
                      placeholder="Таны нэр"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <Label htmlFor="signup-email">Ажлын и-мэйл</Label>
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
                    <Label htmlFor="signup-password">Нууц үг</Label>
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
                        placeholder="Хамгийн багадаа 8 тэмдэгт"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </div>
                  <div className="auth-field">
                    <Label htmlFor="signup-confirm">Нууц үг давтах</Label>
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
                      Үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрч байна.
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
                        Бүртгэл үүсгэж байна…
                      </>
                    ) : (
                      <>
                        Гишүүний бүртгэл үүсгэх <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </form>
                <Alert className="signup-note">
                  <LockKeyhole size={16} />
                  <AlertDescription>
                    Шинэ бүртгэл Member эрхтэй үүснэ. Админ дараа нь эрхийг өөрчилнө.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="auth-card-footer">
            <span>
              <LockKeyhole size={13} />
              Нууц үгийг hash хэлбэрээр, session-ийг аюулгүй HttpOnly cookie-д хадгална.
            </span>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
