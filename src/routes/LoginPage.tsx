import { LoginForm } from '@/components/auth/LoginForm';

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Dentiste</h1>
          <p className="text-muted-foreground">Connectez-vous à votre compte</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
} 