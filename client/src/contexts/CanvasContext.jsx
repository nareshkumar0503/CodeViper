import React, { createContext, useContext, useState } from "react";

const CanvasContext = createContext();

export function CanvasProvider({ children }) {
  const [canvasState, setCanvasState] = useState({
    shapes: [],
    images: [],
    bgColor: "#000000",
  });

  const updateCanvasState = (newState) => {
    try {
      setCanvasState((prevState) => {
        // Check if the new state is different from the previous state
        const updatedState = { ...prevState, ...newState };
        if (
          JSON.stringify(updatedState.shapes) === JSON.stringify(prevState.shapes) &&
          JSON.stringify(updatedState.images) === JSON.stringify(prevState.images) &&
          updatedState.bgColor === prevState.bgColor
        ) {
          console.log("No changes in canvas state, skipping update");
          return prevState; // Return previous state to prevent re-render
        }
        console.log("Updated canvas state:", updatedState);
        return updatedState;
      });
    } catch (error) {
      console.error("Error updating canvas state:", error);
    }
  };

  return (
    <CanvasContext.Provider value={{ canvasState, updateCanvasState }}>
      {children}
    </CanvasContext.Provider>
  );
}

export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
};