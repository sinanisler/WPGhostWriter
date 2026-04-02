import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./components/ui/Toast";
import { AppShell } from "./components/layout/AppShell";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
