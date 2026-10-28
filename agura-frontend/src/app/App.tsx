import { AppProviders } from "./providers";
import { AuthProvider } from "../features/auth/AuthProvider";
import { I18nProvider } from "../lib/i18n";
import { AppRouter } from "./router";
import { ToastProvider } from "../components/Toast";

export function App() {
  return (
    <I18nProvider>
      <AppProviders>
        <ToastProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ToastProvider>
      </AppProviders>
    </I18nProvider>
  );
}
