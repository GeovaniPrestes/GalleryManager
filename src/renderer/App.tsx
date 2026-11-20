
import { useEffect, useState } from "react";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Models from "./pages/Models";
import Sets from "./pages/Sets";
import Minisets from "./pages/Miniset";
import Media from "./pages/Media";
import Audit from "./pages/Audit";

import type { SetRecord, ModelRecord } from "./electron";

function App() {
    const [activePage, setActivePage] = useState("models");
    const [selectedModel, setSelectedModel] = useState<ModelRecord | null>(null);
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
                return (
                    <Models
                        editingEnabled={editingEnabled}
                        onSelectModel={(model) => {
                            setSelectedModel(model);
                            setActivePage("sets");
                        }}
                    />
                );

            case "sets":
                return (
                    <Sets
                        onOpenSet={setSelectedSet}
                        selectedModel={selectedModel}
                        editingEnabled={editingEnabled}
                        onBackToModels={() => {
                            setSelectedModel(null);
                            setActivePage("models");
                        }}
                    />
                );

            case "media":
                return <Media />;

            case "audit":
                return <Audit />;

            default:
                return <Models
                    editingEnabled={editingEnabled}
                    onSelectModel={(model) => {
                        setSelectedModel(model);
                        setActivePage("sets");
                    }}
                />;
        }
    }

    return (
        <MainLayout
            activePage={selectedSet ? "sets" : activePage}
            onNavigate={(page) => {
                setSelectedSet(null);
                setSelectedModel(null);
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
