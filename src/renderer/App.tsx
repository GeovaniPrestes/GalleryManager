import { useState } from "react";

import MainLayout from "./components/MainLayout";

import Dashboard from "./pages/Dashboard";
import Models from "./pages/Models";
import Sets from "./pages/Sets";
import Minisets from "./pages/Miniset";
import Media from "./pages/Media";

import type { SetRecord } from "./electron";

function App() {
    const [activePage, setActivePage] = useState("dashboard");
    const [selectedSet, setSelectedSet] = useState<SetRecord | null>(null);

    function renderPage() {
        if (selectedSet) {
            return (
                <Minisets
                    setId={selectedSet.id}
                    setName={selectedSet.name}
                    onBackToSets={() => {
                        setSelectedSet(null);
                        setActivePage("sets");
                    }}
                />
            );
        }

        switch (activePage) {
            case "dashboard":
                return <Dashboard />;

            case "models":
                return <Models />;

            case "sets":
                return <Sets onOpenSet={setSelectedSet} />;

            case "media":
                return <Media />;
            default:
                return <Dashboard />;
        }
    }

    return (
        <MainLayout
            activePage={selectedSet ? "minisets" : activePage}
            onNavigate={(page) => {
                setSelectedSet(null);
                setActivePage(page);
            }}
        >
            {renderPage()}
        </MainLayout>
    );
}

export default App;