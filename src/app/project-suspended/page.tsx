'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ArrowLeft, Mail } from 'lucide-react';

export default function ProjectSuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <Building2 className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Project Suspended</h1>
          <p className="text-muted-foreground mb-6">
            This project has been temporarily suspended. This could be due to billing
            issues or administrative action. Please contact support for assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/select-project">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Switch Project
              </Link>
            </Button>
            <Button asChild>
              <a href="mailto:support@schoolops.com">
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
