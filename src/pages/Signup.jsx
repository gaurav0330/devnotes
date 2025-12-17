import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, UserPlus } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirm) {
      setError("Please fill all fields");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signup(email, password);
      navigate("/");
    } catch {
      setError("Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border border-border shadow-xl animate-scale-in">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-foreground">
            Create Account
          </CardTitle>
          <p className="text-muted-foreground">
            Start writing beautiful notes
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
                {error}
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-10 h-12"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="password"
                className="pl-10 h-12"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="password"
                className="pl-10 h-12"
                placeholder="Confirm Password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? "Creating..." : <>
                <UserPlus className="h-5 w-5 mr-2" /> Create Account
              </>}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}