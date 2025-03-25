import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MobileRecordPage } from "@/routes/MobileRecordPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/mobile-record" element={<MobileRecordPage />} />
      </Routes>
    </Router>
  );
}

export default App;
