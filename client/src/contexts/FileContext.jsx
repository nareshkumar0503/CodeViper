import React, { createContext, useContext, useState } from "react";
import { saveAs } from "file-saver";
import JSZip from "jszip";

const FileContext = createContext();

export const useFileSystem = () => {
    const context = useContext(FileContext);
    if (!context) {
        throw new Error("useFileSystem must be used within a FileProvider");
    }
    return context;
};

export const FileProvider = ({ children }) => {
    const [files, setFiles] = useState([]);
    const [activeFile, setActiveFile] = useState(null);

    const createFile = (fileName) => {
        const newFile = { name: fileName, content: "" };
        setFiles([...files, newFile]);
        setActiveFile(newFile);
    };

    const deleteFile = (fileName) => {
        const updatedFiles = files.filter((file) => file.name !== fileName);
        setFiles(updatedFiles);
        if (activeFile?.name === fileName) {
            setActiveFile(null);
        }
    };

    const downloadFile = (fileName) => {
        const file = files.find((file) => file.name === fileName);
        if (file) {
            const blob = new Blob([file.content], { type: "text/plain" });
            saveAs(blob, file.name);
        }
    };

    const downloadAllFiles = () => {
        const zip = new JSZip();
        files.forEach((file) => {
            zip.file(file.name, file.content);
        });
        zip.generateAsync({ type: "blob" }).then((content) => {
            saveAs(content, "code.zip");
        });
    };

    return (
        <FileContext.Provider
            value={{
                files,
                activeFile,
                setActiveFile,
                createFile,
                deleteFile,
                downloadFile,
                downloadAllFiles,
            }}
        >
            {children}
        </FileContext.Provider>
    );
};