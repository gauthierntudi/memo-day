import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { HardHat, Lock, Mail, AlertCircle, ArrowLeft } from "lucide-react";

interface LoginPageProps {
  onBack?: () => void;
}

export default function LoginPage({ onBack }: LoginPageProps) {
  const { login, loginError, isLoggingIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    await login(email.trim(), password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <HardHat className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="heading-login">MEM - DAY ON SITE</CardTitle>
          <CardDescription>Construction Daily Report System</CardDescription>
        </CardHeader>
        <CardContent>
          {loginError && (
            <Alert variant="destructive" className="mb-4" data-testid="alert-auth-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  data-testid="input-login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  data-testid="input-login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoggingIn} data-testid="button-login">
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Only authorized users can sign in. Contact your administrator for access.
          </p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-4 w-full"
              data-testid="link-back-to-landing"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
