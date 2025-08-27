import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useFileSystem } from "./FileContext";

const RunCodeContext = createContext();

export const useRunCode = () => {
    const context = useContext(RunCodeContext);
    if (!context) {
        throw new Error("useRunCode must be used within a RunCodeProvider");
    }
    return context;
};

export const RunCodeProvider = ({ children }) => {
    const { activeFile } = useFileSystem();
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [supportedLanguages, setSupportedLanguages] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState("");

    useEffect(() => {
        const fetchSupportedLanguages = async () => {
            try {
                const response = await axios.get("/api/languages");
                setSupportedLanguages(response.data);
            } catch (error) {
                toast.error("Failed to fetch supported languages");
            }
        };
        fetchSupportedLanguages();
    }, []);

    const runCode = async () => {
        if (!activeFile) {
            toast.error("No file selected");
            return;
        }

        setIsRunning(true);
        try {
            const response = await axios.post("/api/execute", {
                language: selectedLanguage,
                files: [{ name: activeFile.name, content: activeFile.content }],
                stdin: input,
            });
            setOutput(response.data.output);
        } catch (error) {
            toast.error("Failed to run code");
            setOutput(error.response?.data?.error || "An error occurred");
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <RunCodeContext.Provider
            value={{
                input,
                setInput,
                output,
                isRunning,
                supportedLanguages,
                selectedLanguage,
                setSelectedLanguage,
                runCode,
            }}
        >
            {children}
        </RunCodeContext.Provider>
    );
};