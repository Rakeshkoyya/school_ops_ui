'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { PermissionGuard } from '@/components/guards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  Receipt,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

// Placeholder data for fee management
const feeStats = {
  totalCollected: 125000,
  totalPending: 45000,
  totalStudents: 250,
  defaulters: 35,
};

const recentPayments = [
  {
    id: 1,
    studentId: 'STU001',
    studentName: 'John Doe',
    class: '10-A',
    amount: 5000,
    feeType: 'Tuition Fee',
    status: 'paid',
    date: '2026-01-15',
  },
  {
    id: 2,
    studentId: 'STU002',
    studentName: 'Jane Smith',
    class: '9-B',
    amount: 5000,
    feeType: 'Tuition Fee',
    status: 'paid',
    date: '2026-01-14',
  },
  {
    id: 3,
    studentId: 'STU003',
    studentName: 'Mike Johnson',
    class: '10-A',
    amount: 2500,
    feeType: 'Lab Fee',
    status: 'pending',
    date: '2026-01-10',
  },
  {
    id: 4,
    studentId: 'STU004',
    studentName: 'Sarah Wilson',
    class: '8-C',
    amount: 5000,
    feeType: 'Tuition Fee',
    status: 'overdue',
    date: '2026-01-01',
  },
];

const statusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
};

export default function FeesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <PermissionGuard>
      <MainLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Fee Management</h1>
              <p className="text-muted-foreground">
                Manage student fees, payments, and collection records
              </p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{feeStats.totalCollected.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">₹{feeStats.totalPending.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">From {feeStats.defaulters} students</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{feeStats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Active enrollments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Defaulters</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{feeStats.defaulters}</div>
                <p className="text-xs text-muted-foreground">Overdue payments</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>View and manage fee payment records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by student name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.studentId}</TableCell>
                      <TableCell>{payment.studentName}</TableCell>
                      <TableCell>{payment.class}</TableCell>
                      <TableCell>{payment.feeType}</TableCell>
                      <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[payment.status]}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </PermissionGuard>
  );
}
