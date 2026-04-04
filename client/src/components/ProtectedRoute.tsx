import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

type UserRole = 'advocate' | 'brand' | 'admin';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading } = useAuthStore();
    const location = useLocation();

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '1.2rem',
                color: '#666',
            }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        const roleRedirects: Record<UserRole, string> = {
            advocate: '/advocate/dashboard',
            brand: '/brand/dashboard',
            admin: '/admin/dashboard',
        };
        return <Navigate to={roleRedirects[user.role]} replace />;
    }

    return <>{children}</>;
}
