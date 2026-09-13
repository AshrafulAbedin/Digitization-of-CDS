import { Route, Routes } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { CashierPOS } from './pages/pos/CashierPOS';
import { KitchenDisplay } from './pages/kitchen/KitchenDisplay';
import { TokenDisplay } from './pages/token/TokenDisplay';
import { Inventory } from './pages/inventory/Inventory';
import { OwnerDashboard } from './pages/analytics/OwnerDashboard';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pos" element={<CashierPOS />} />
      <Route path="/kitchen" element={<KitchenDisplay />} />
      <Route path="/tokens" element={<TokenDisplay />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/analytics" element={<OwnerDashboard />} />
    </Routes>
  );
}
