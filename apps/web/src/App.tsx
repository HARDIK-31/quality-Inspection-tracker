import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/AppLayout';
import { ListPage } from './pages/ListPage';
import { NewInspectionPage } from './pages/NewInspectionPage';
import { InspectionDetailPage } from './pages/InspectionDetailPage';
import { SummaryPage } from './pages/SummaryPage';
import { LoginPage } from './pages/LoginPage';
import { ApiError } from './lib/api';
import { Spinner } from './components/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isNetworkError) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // Default 'online' pauses mutations when offline and never settles the
      // promise, leaving the save button spinning. Fail fast instead.
      networkMode: 'always',
    },
  },
});

function AuthGate() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Starting" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ListPage />} />
        <Route path="new" element={<NewInspectionPage />} />
        <Route path="inspections/:id" element={<InspectionDetailPage />} />
        <Route path="summary" element={<SummaryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AuthGate />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
