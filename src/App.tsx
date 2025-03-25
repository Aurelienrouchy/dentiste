import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MobileRecordPage } from "@/routes/MobileRecordPage";
import { DocumentsPage } from "@/routes/DocumentsPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DocumentsPage />} />
        <Route path="/mobile-record" element={<MobileRecordPage />} />
      </Routes>
    </Router>
  );
}

export default App;
