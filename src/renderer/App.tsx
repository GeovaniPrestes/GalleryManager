import { useState } from "react";

import MainLayout from "./components/MainLayout";
import Sets from "./pages/Sets";
import Minisets from "./pages/Miniset";
import Models from "./pages/Models";
import type { SetRecord } from "./electron";

function App() {
    const [selectedSet, setSelectedSet] = useState<SetRecord | null>(null);

    return (
        <MainLayout>
            <Models />
            
            {selectedSet ? (
                <Minisets
                    setId={selectedSet.id}
                    setName={selectedSet.name}
                    onBackToSets={() => setSelectedSet(null)}
                />
            ) : (
                <Sets onOpenSet={setSelectedSet} />
            )}
        </MainLayout>
    );
}

export default App;
