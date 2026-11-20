import { useEffect, useState } from "react";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Models from "./pages/Models";
import Sets from "./pages/Sets";
import Minisets from "./pages/Miniset";
import Media from "./pages/Media";
import Audit from "./pages/Audit";

import type { SetRecord } from "./electron";

function App() {
    const [activePage, setActivePage] = useState("dashboard");
    const [selectedSet, setSelectedSet] = useState<SetRecord | null>(null);
    const [editingEnabled, setEditingEnabled] = useState(
        () => localStorage.getItem("galerymanager-editing-enabled") === "true"
    );

    useEffect(() => {
        localStorage.setItem(
            "galerymanager-editing-enabled",
            String(editingEnabled)
        );
    }, [editingEnabled]);

    async function refreshSelectedSet() {
        if (!selectedSet) return;

        const sets = await window.electronAPI.listSets();

        const updatedSet = sets.find(
            (gallerySet) => gallerySet.id === selectedSet.id
        );

        if (updatedSet) {
            setSelectedSet(updatedSet);
        }
    }

    function renderPage() {
        if (selectedSet) {
            return (
                <Minisets
                    setId={selectedSet.id}
                    setName={selectedSet.name}
                    mediaIndexStatus={selectedSet.mediaIndexStatus}
                    onSetUpdated={refreshSelectedSet}
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

            case "audit":
                return <Audit />;

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
            editingEnabled={editingEnabled}
            onToggleEditing={() => setEditingEnabled(current => !current)}
        >
            {renderPage()}
        </MainLayout>
    );
}

export default App;