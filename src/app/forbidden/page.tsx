'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX, ArrowLeft, LogIn } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold mb-2">403</h1>
          <h2 className="text-xl font-semibold mb-4">Access Forbidden</h2>
          <p className="text-muted-foreground mb-6">
            You don&apos;t have permission to access this resource. Please contact your
            administrator if you believe this is an error.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button asChild>
              <Link href="/auth/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
