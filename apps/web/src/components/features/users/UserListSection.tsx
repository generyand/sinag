"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsers } from "@/hooks/useUsers";
import type { User, UserListResponse } from "@sinag/shared";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { UserForm } from "./UserForm";
import { UserManagementSkeleton } from "./UserManagementSkeleton";
import UserManagementTable from "./UserManagementTable";

export default function UserListSection() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;

  // Debounce search query to prevent lag during typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery]);
  const { data, isLoading, error } = useUsers({
    page: 1,
    size: 100, // Fetch up to 100 users to show all users
  }) as {
    data?: UserListResponse;
    isLoading: boolean;
    error: unknown;
  };

  // Filter and paginate users - now using debounced search query
  const filteredAndPaginatedUsers = useMemo(() => {
    if (!data?.users) return { users: [], totalPages: 0, totalUsers: 0 };

    // Filter users based on debounced search query (prevents lag during typing)
    const filtered = data.users.filter(
      (user) =>
        user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (user.phone_number && user.phone_number.includes(debouncedSearchQuery))
    );

    // Calculate pagination
    const totalPages = Math.ceil(filtered.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const paginatedUsers = filtered.slice(startIndex, startIndex + usersPerPage);

    return {
      users: paginatedUsers,
      totalPages,
      totalUsers: data.total || filtered.length, // Use API total if available
      allFilteredUsers: filtered,
    };
  }, [data?.users, data?.total, debouncedSearchQuery, currentPage]);

  // Reset to first page when debounced search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  const handleEditUser = useCallback((user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingUser(null);
  }, []);

  // Memoize stats calculations to prevent unnecessary recalculations
  const stats = useMemo(() => {
    if (!data?.users) return { total: 0, active: 0, blgu: 0 };

    return {
      total: data.total || data.users.length,
      active: data.users.filter((u) => u.is_active).length,
      blgu: data.users.filter((u) => u.role === "BLGU_USER").length,
    };
  }, [data?.users, data?.total]);

  if (isLoading) {
    return <UserManagementSkeleton />;
  }
  if (error) {
    console.error("User loading error:", error);
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          <svg
            className="w-12 h-12 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Error Loading Users</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Unable to fetch user data. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!data || !data.users) {
    return <div className="text-[var(--muted-foreground)]">No users found.</div>;
  }

  return (
    <div className="space-y-8" role="main" aria-label="User management">
      {/* Enhanced Header Section */}
      <header className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6 sm:p-8">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"></div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                User{" "}
                <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                  Management
                </span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Manage user accounts, roles, and permissions across the platform
              </p>
            </div>

            {/* Enhanced Quick Stats */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
              <div className="flex gap-4 sm:contents">
                <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)] flex-1 sm:flex-none sm:min-w-[100px]">
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                    {stats.total}
                  </div>
                  <div className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Total
                  </div>
                </div>
                <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)] flex-1 sm:flex-none sm:min-w-[100px]">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {stats.active}
                  </div>
                  <div className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Active
                  </div>
                </div>
              </div>
              <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)] min-w-[100px]">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                  {stats.blgu}
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  BLGU
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced User Table with Search and Pagination */}
      <section
        className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden"
        aria-labelledby="user-accounts-heading"
      >
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 id="user-accounts-heading" className="text-xl font-bold text-[var(--foreground)]">
                User Accounts
              </h2>
              <p className="text-[var(--text-secondary)] mt-1 text-sm">
                {filteredAndPaginatedUsers.allFilteredUsers?.length || data.users.length} user
                {(filteredAndPaginatedUsers.allFilteredUsers?.length || data.users.length) !== 1
                  ? "s"
                  : ""}{" "}
                registered
              </p>
            </div>

            {/* Search Bar and Add User Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-[var(--muted-foreground)]" />
                </div>
                <Input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full bg-[var(--background)] border-[var(--border)] rounded-sm focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 transition-all duration-200"
                  aria-label="Search users by name, email, or role"
                />
              </div>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="px-6 py-2.5 font-semibold hover:shadow-lg transition-all duration-200"
                style={{
                  background:
                    "linear-gradient(to bottom right, var(--cityscape-yellow), var(--cityscape-yellow-dark))",
                  color: "var(--foreground)",
                }}
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New User
              </Button>
            </div>
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span>
                Found {filteredAndPaginatedUsers.allFilteredUsers?.length || 0} result
                {(filteredAndPaginatedUsers.allFilteredUsers?.length || 0) !== 1 ? "s" : ""}
                {searchQuery && ` for "${searchQuery}"`}
              </span>
              <button
                onClick={() => setSearchQuery("")}
                className="text-[var(--cityscape-yellow)] hover:text-[var(--cityscape-yellow-dark)] font-medium transition-colors text-xs"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          <UserManagementTable
            users={filteredAndPaginatedUsers.users}
            onEditUser={handleEditUser}
          />

          {/* Pagination Controls */}
          {filteredAndPaginatedUsers.totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-[var(--text-secondary)]">
                Showing {(currentPage - 1) * usersPerPage + 1} to{" "}
                {Math.min(
                  currentPage * usersPerPage,
                  filteredAndPaginatedUsers.allFilteredUsers?.length || 0
                )}{" "}
                of {filteredAndPaginatedUsers.allFilteredUsers?.length || 0} users
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 bg-[var(--background)] hover:bg-[var(--muted)]/20 border-[var(--border)] rounded-sm transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: filteredAndPaginatedUsers.totalPages },
                    (_, i) => i + 1
                  ).map((pageNum) => {
                    // Show first page, last page, current page, and pages around current page
                    const showPage =
                      pageNum === 1 ||
                      pageNum === filteredAndPaginatedUsers.totalPages ||
                      Math.abs(pageNum - currentPage) <= 1;

                    if (!showPage && pageNum === 2 && currentPage > 4) {
                      return (
                        <span key={pageNum} className="px-2 text-[var(--muted-foreground)]">
                          ...
                        </span>
                      );
                    }

                    if (
                      !showPage &&
                      pageNum === filteredAndPaginatedUsers.totalPages - 1 &&
                      currentPage < filteredAndPaginatedUsers.totalPages - 3
                    ) {
                      return (
                        <span key={pageNum} className="px-2 text-[var(--muted-foreground)]">
                          ...
                        </span>
                      );
                    }

                    if (!showPage) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-sm font-medium transition-all duration-200 ${
                          currentPage === pageNum
                            ? "shadow-md text-[var(--foreground)]"
                            : "bg-[var(--background)] hover:bg-[var(--muted)]/20 border border-[var(--border)] text-[var(--foreground)]"
                        }`}
                        style={
                          currentPage === pageNum
                            ? {
                                background:
                                  "linear-gradient(to bottom right, var(--cityscape-yellow), var(--cityscape-yellow-dark))",
                              }
                            : undefined
                        }
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(prev + 1, filteredAndPaginatedUsers.totalPages)
                    )
                  }
                  disabled={currentPage === filteredAndPaginatedUsers.totalPages}
                  className="flex items-center gap-2 bg-[var(--background)] hover:bg-[var(--muted)]/20 border-[var(--border)] rounded-sm transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* No Results Message */}
          {filteredAndPaginatedUsers.users.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[var(--muted)]/20 rounded-sm flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                No users found
              </h3>
              <p className="text-[var(--text-secondary)] mb-4">
                No users match your search for &quot;{searchQuery}&quot;. Try adjusting your search
                terms.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 rounded-sm font-medium hover:shadow-lg transition-all duration-200"
                style={{
                  background:
                    "linear-gradient(to bottom right, var(--cityscape-yellow), var(--cityscape-yellow-dark))",
                  color: "var(--foreground)",
                }}
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </section>

      <MemoizedUserForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        editingUser={editingUser}
      />
    </div>
  );
}

// Memoized wrapper for UserForm to prevent unnecessary re-renders
// This component memoizes the initialValues computation
const MemoizedUserForm = React.memo(function MemoizedUserForm({
  open,
  onOpenChange,
  editingUser,
}: {
  open: boolean;
  onOpenChange: () => void;
  editingUser: User | null;
}) {
  // Memoize initialValues to prevent new object creation on every render
  const initialValues = useMemo(() => {
    if (!editingUser) return undefined;
    return {
      id: editingUser.id,
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role,
      phone_number: editingUser.phone_number || undefined,
      validator_area_id: editingUser.validator_area_id || undefined,
      barangay_id: editingUser.barangay_id || undefined,
      is_active: editingUser.is_active,
      is_superuser: editingUser.is_superuser,
      must_change_password: editingUser.must_change_password,
    };
  }, [editingUser]);

  return (
    <UserForm
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      isEditing={!!editingUser}
    />
  );
});
