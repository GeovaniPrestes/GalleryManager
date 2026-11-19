import { useState } from "react";

import MainLayout from "./components/MainLayout";
import Sets from "./pages/Sets";
import Minisets from "./pages/Miniset";
import type { SetRecord } from "./electron";

function App() {
    const [selectedSet, setSelectedSet] = useState<SetRecord | null>(null);

    return (
        <MainLayout>
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
