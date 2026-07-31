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
import { BrandLogo } from "@/components/atoms/brand-logo";
import { IconButton } from "@/components/atoms/icon-button";
import { UserAvatar } from "@/components/atoms/user-avatar";
import { AuthLayout } from "@/components/templates/auth-layout";
import { ROLE_LABELS } from "@/lib/permissions";
import type { WorkspaceUser } from "@/lib/types";
import { cn } from "@/lib/utils";
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
    <AuthLayout
      showcase={
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_15%_12%,rgba(255,255,255,0.2),transparent_26%),radial-gradient(circle_at_80%_86%,var(--login-accent),transparent_24%),linear-gradient(145deg,var(--brand-hero-start)_0%,var(--brand-hero-middle)_52%,var(--brand-hero-end)_100%)] p-[clamp(32px,5vw,70px)] text-white after:absolute after:top-[26%] after:-right-[155px] after:h-[260px] after:w-[390px] after:rotate-[18deg] after:rounded-[42px] after:border after:border-white/[0.13] after:content-[''] max-auth:p-[38px] max-mobile:hidden">
        <div className="relative z-[1] flex items-center gap-[11px] font-heading text-[22px] font-extrabold tracking-[-0.7px]">
          <BrandLogo size="auth" />
          <strong>Pro Team</strong>
        </div>
        <div className="relative z-[1] my-auto max-w-[530px] py-[60px]">
          <span className="text-[11px] font-bold tracking-[1.4px] text-white/70 uppercase">
            Танай багийн ажлын нэгдсэн орон зай
          </span>
          <h1 className="my-[18px] mb-6 max-w-[520px] font-heading text-[clamp(42px,4.4vw,68px)] leading-[1.02] tracking-[-3px] max-auth:text-[44px]">
            Ажлаа хамтдаа урагшлуул.
          </h1>
          <p className="m-0 max-w-[490px] text-base leading-[1.7] text-white/75">
            Төслөө төлөвлөж, хариуцагчаа тодорхой болгож, том зорилгыг
            хэрэгжихүйц дэд ажлуудад хуваарилаарай.
          </p>
          <div className="mt-[42px] grid gap-[15px] max-auth:mt-[30px]">
            <span className="flex items-center gap-[11px] text-[13px] font-semibold [&_svg]:text-[var(--success-highlight)]">
              <CheckCircle2 size={18} /> Тодорхой эзэн, хамтын хариуцлага
            </span>
            <span className="flex items-center gap-[11px] text-[13px] font-semibold [&_svg]:text-[var(--success-highlight)]">
              <CheckCircle2 size={18} /> Таск, дэд таск, самбар, календарь
            </span>
            <span className="flex items-center gap-[11px] text-[13px] font-semibold [&_svg]:text-[var(--success-highlight)]">
              <CheckCircle2 size={18} /> Рольд суурилсан аюулгүй хандалт
            </span>
          </div>
        </div>
        <div className="relative z-[1] flex items-center gap-[18px] border-t border-white/15 pt-[26px]">
          <div className="flex">
            {activeUsers.slice(0, 4).map((user) => (
              <UserAvatar
                user={user}
                className="-ml-[7px] size-[34px] border-0 shadow-[0_0_0_2px_var(--brand-hero-middle)] first:ml-0"
                key={user.id}
              />
            ))}
          </div>
          <span className="[&_small]:block [&_strong]:block">
            <strong className="text-xs">Acme Studio</strong>
            <small className="mt-1 text-[10px] text-white/60">
              Багтаа нэгдэж, хамтран ажиллаж эхлээрэй
            </small>
          </span>
        </div>
      </section>
      }
    >

      <section className="relative flex min-h-screen items-center justify-center bg-surface p-[54px] max-auth:p-11 max-mobile:min-h-screen max-mobile:p-[32px_22px] max-compact:items-start max-compact:pt-16">
        <IconButton
          className="absolute top-[26px] right-7 bg-surface-soft"
          onClick={onToggleTheme}
          aria-label={`${theme === "light" ? "Бараан" : "Цайвар"} горим ашиглах`}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </IconButton>

        <Card className="w-full max-w-[450px] gap-0 overflow-visible rounded-none bg-transparent py-0 leading-[normal] ring-0 shadow-none">
          <CardHeader className="mb-[30px] gap-0 px-0">
            <BrandLogo
              size="auth"
              className="mb-5 hidden max-mobile:inline-flex"
            />
            <span className="text-[11px] font-bold tracking-[1.4px] text-primary uppercase">
              {mode === "login" ? "Тавтай морил" : "Шинэ бүртгэл"}
            </span>
            <CardTitle className="my-2.5 mb-2 font-heading text-[30px] leading-[normal] font-bold tracking-[-1.2px] max-mobile:text-[27px]">
              {mode === "login"
                ? "Workspace-даа нэвтрэх"
                : "Acme Studio-д нэгдэх"}
            </CardTitle>
            <CardDescription className="text-xs leading-[1.6] text-muted-foreground">
              {mode === "login"
                ? "Бүртгэлийн мэдээллээ оруулах эсвэл demo эрх сонгоно уу."
                : "Гишүүний бүртгэл үүсгээд багтайгаа ажиллаж эхлээрэй."}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-0">
            <Tabs
              className="flex-col gap-0"
              value={mode}
              onValueChange={changeMode}
            >
              <TabsList
                className="grid h-auto w-full grid-cols-2 gap-1 rounded-[9px] border border-border bg-surface-soft p-1"
                aria-label="Нэвтрэлт"
              >
                <TabsTrigger
                  className="h-[34px] rounded-md text-[10px] font-bold text-muted-foreground data-active:bg-surface data-active:text-foreground data-active:shadow-[0_2px_8px_rgba(28,31,44,0.08)] dark:data-active:shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                  value="login"
                >
                  Нэвтрэх
                </TabsTrigger>
                <TabsTrigger
                  className="h-[34px] rounded-md text-[10px] font-bold text-muted-foreground data-active:bg-surface data-active:text-foreground data-active:shadow-[0_2px_8px_rgba(28,31,44,0.08)] dark:data-active:shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                  value="signup"
                >
                  Бүртгүүлэх
                </TabsTrigger>
              </TabsList>

              <TabsContent className="mt-[21px]" value="login">
                <form className="grid gap-4" onSubmit={submitLogin}>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold" htmlFor="login-email">
                      Ажлын и-мэйл
                    </Label>
                    <Input
                      className="h-[46px] rounded-[9px] border-input bg-surface-soft px-[13px] text-sm focus-visible:bg-surface"
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
                  <div className="grid gap-2">
                    <Label
                      className="text-[10px] font-bold"
                      htmlFor="login-password"
                    >
                      Нууц үг
                    </Label>
                    <span className="relative block">
                      <Input
                        className="h-[46px] rounded-[9px] border-input bg-surface-soft px-[13px] pr-[46px] text-sm focus-visible:bg-surface"
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
                        className="absolute top-[3px] right-[3px] flex size-10 items-center justify-center bg-transparent text-muted-foreground"
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </div>
                  <div className="my-3 mb-5 flex items-center justify-between text-[9px] text-muted-foreground max-compact:flex-col max-compact:items-start max-compact:gap-2">
                    <span className="flex items-center gap-1.5">
                      <Checkbox
                        id="remember"
                        checked={remember}
                        onCheckedChange={(checked) => setRemember(checked === true)}
                      />
                      <Label
                        className="cursor-pointer text-[9px] leading-[1.35] font-medium text-muted-foreground"
                        htmlFor="remember"
                      >
                        Нэвтэрсэн хэвээр үлдэх
                      </Label>
                    </span>
                    <span>Demo нууц үг: nimbus</span>
                  </div>
                  {error && (
                    <Alert
                      className="-mt-1 rounded-lg px-[11px] py-2.5 text-[9px]"
                      variant="destructive"
                    >
                      <AlertDescription className="text-[9px]">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    className="h-[46px] w-full gap-[9px] rounded-[9px] bg-[linear-gradient(135deg,var(--brand),var(--brand-hover))] text-[11px] font-bold text-white shadow-[0_10px_25px_color-mix(in_srgb,var(--brand)_24%,transparent)] hover:bg-[linear-gradient(135deg,var(--brand-hover),var(--brand-hero-end))]"
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle className="animate-spin" size={17} />
                        Нэвтэрч байна…
                      </>
                    ) : (
                      <>
                        Workspace руу орох <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </form>

                <div className="my-[25px] mb-3.5 flex items-center gap-3 text-[9px] text-muted-foreground before:h-px before:flex-1 before:bg-border before:content-[''] after:h-px after:flex-1 after:bg-border after:content-['']">
                  <span>эсвэл demo эрх сонгох</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-mobile:grid-cols-1">
                  {activeUsers.map((user) => (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "grid h-auto min-w-0 grid-cols-[31px_1fr] justify-stretch gap-[9px] whitespace-normal rounded-[9px] border-border bg-surface-soft p-[9px] text-left leading-[normal] hover:bg-surface-hover",
                        email === user.email &&
                          "border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-subtle",
                      )}
                      onClick={() => {
                        setEmail(user.email);
                        setPassword("nimbus");
                        setError("");
                      }}
                      key={user.id}
                    >
                      <UserAvatar user={user} size="md" />
                      <span className="min-w-0">
                        <strong className="flex min-w-0 text-[9px]">
                          {user.name}
                        </strong>
                        <small className="mt-[3px] flex min-w-0 items-center gap-1 text-[8px] text-muted-foreground">
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

              <TabsContent className="mt-[21px]" value="signup">
                <form className="grid gap-4" onSubmit={submitSignup}>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold" htmlFor="signup-name">
                      Овог нэр
                    </Label>
                    <Input
                      className="h-[46px] rounded-[9px] border-input bg-surface-soft px-[13px] text-sm focus-visible:bg-surface"
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
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold" htmlFor="signup-email">
                      Ажлын и-мэйл
                    </Label>
                    <Input
                      className="h-[46px] rounded-[9px] border-input bg-surface-soft px-[13px] text-sm focus-visible:bg-surface"
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
                  <div className="grid gap-2">
                    <Label
                      className="text-[10px] font-bold"
                      htmlFor="signup-password"
                    >
                      Нууц үг
                    </Label>
                    <span className="relative block">
                      <Input
                        className="h-[46px] rounded-[9px] border-input bg-surface-soft px-[13px] pr-[46px] text-sm focus-visible:bg-surface"
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
                        className="absolute top-[3px] right-[3px] flex size-10 items-center justify-center bg-transparent text-muted-foreground"
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <Label
                      className="text-[10px] font-bold"
                      htmlFor="signup-confirm"
                    >
                      Нууц үг давтах
                    </Label>
                    <Input
                      className="h-[46px] rounded-[9px] border-input bg-surface-soft px-[13px] text-sm focus-visible:bg-surface"
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
                  <span className="my-px mb-0.5 flex items-start gap-1.5">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) =>
                        setAcceptedTerms(checked === true)
                      }
                    />
                    <Label
                      className="cursor-pointer text-[9px] leading-[1.35] font-medium text-muted-foreground"
                      htmlFor="terms"
                    >
                      Үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрч байна.
                    </Label>
                  </span>
                  {error && (
                    <Alert
                      className="-mt-1 rounded-lg px-[11px] py-2.5 text-[9px]"
                      variant="destructive"
                    >
                      <AlertDescription className="text-[9px]">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    className="h-[46px] w-full gap-[9px] rounded-[9px] bg-[linear-gradient(135deg,var(--brand),var(--brand-hover))] text-[11px] font-bold text-white shadow-[0_10px_25px_color-mix(in_srgb,var(--brand)_24%,transparent)] hover:bg-[linear-gradient(135deg,var(--brand-hover),var(--brand-hero-end))]"
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle className="animate-spin" size={17} />
                        Бүртгэл үүсгэж байна…
                      </>
                    ) : (
                      <>
                        Гишүүний бүртгэл үүсгэх <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </form>
                <Alert className="mt-3.5 rounded-lg px-[11px] py-2.5 text-[9px]">
                  <LockKeyhole size={16} />
                  <AlertDescription className="text-[9px]">
                    Шинэ бүртгэл Member эрхтэй үүснэ. Админ дараа нь эрхийг өөрчилнө.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="mt-5 border-t border-border bg-transparent px-0 pt-3.5 pb-0">
            <span className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
              <LockKeyhole size={13} />
              Нууц үгийг hash хэлбэрээр, session-ийг аюулгүй HttpOnly cookie-д хадгална.
            </span>
          </CardFooter>
        </Card>
      </section>
    </AuthLayout>
  );
}
