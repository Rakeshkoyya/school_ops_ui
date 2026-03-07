'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Mail, Building2, LogOut } from 'lucide-react';

export default function WelcomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckSquare className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Trackbit!</CardTitle>
          <CardDescription className="text-base">
            Hi {user?.name || 'there'}, your account has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-2 font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              No Project Access Yet
            </h3>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t been assigned to any organization or project yet. 
              Please contact your organization administrator to get access.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-1">Need to join an existing organization?</h4>
              <p className="text-sm text-muted-foreground">
                Contact your organization admin and ask them to add your email address 
                ({user?.username || 'your account'}) to their project.
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-1 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Want to create a new organization?
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Contact our team to set up your own organization and get started with Trackbit.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:support@trackbit.io?subject=New Organization Request">
                  Contact Support
                </a>
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
