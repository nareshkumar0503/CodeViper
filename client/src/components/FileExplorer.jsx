import React, { useState, useEffect } from "react";
import { FaFolder, FaFile, FaPlus, FaTrash, FaEdit } from "react-icons/fa";
import toast from "react-hot-toast";

const FileExplorer = ({ socketRef, roomId, codeRef, onFileSelect, files, setFiles }) => {
  const [newFileName, setNewFileName] = useState("");
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on("file_added", ({ file }) => {
      setFiles(prev => [...prev, file]);
      toast.success(`File ${file.name} added`);
    });

    socketRef.current.on("file_deleted", ({ fileName }) => {
      setFiles(prev => prev.filter(file => file.name !== fileName));
      toast.success(`File ${fileName} deleted`);
    });

    socketRef.current.on("file_renamed", ({ oldName, newName }) => {
      setFiles(prev =>
        prev.map(file =>
          file.name === oldName ? { ...file, name: newName } : file
        )
      );
      toast.success(`File renamed to ${newName}`);
    });

    return () => {
      socketRef.current?.off("file_added");
      socketRef.current?.off("file_deleted");
      socketRef.current?.off("file_renamed");
    };
  }, [socketRef, setFiles]);

  const addFile = () => {
    if (!newFileName) {
      toast.error("Please enter a file name");
      return;
    }

    const extension = newFileName.split(".").pop().toLowerCase();
    const supportedExtensions = ["java", "py"];
    if (!supportedExtensions.includes(extension)) {
      toast.error("Only .java and .py files are supported");
      return;
    }

    const file = {
      name: newFileName,
      language: extension === "java" ? "java" : "python",
    };

    if (files.some(f => f.name === file.name)) {
      toast.error("File already exists");
      return;
    }

    setFiles(prev => [...prev, file]);
    socketRef.current?.emit("file_added", { roomId, file });
    setNewFileName("");
    toast.success(`File ${file.name} created`);
  };

  const deleteFile = (fileName) => {
    setFiles(prev => prev.filter(file => file.name !== fileName));
    socketRef.current?.emit("file_deleted", { roomId, fileName });

    // Clear the selected file if it's the one being deleted
    if (onFileSelect && files.find(f => f.name === fileName)) {
      onFileSelect(null);
    }
  };

  const startRenaming = (file) => {
    setRenamingFile(file.name);
    setRenameValue(file.name);
  };

  const renameFile = (oldName) => {
    if (!renameValue) {
      toast.error("Please enter a new file name");
      return;
    }

    const extension = renameValue.split(".").pop().toLowerCase();
    const supportedExtensions = ["java", "py"];
    if (!supportedExtensions.includes(extension)) {
      toast.error("Only .java and .py files are supported");
      return;
    }

    if (files.some(f => f.name === renameValue && f.name !== oldName)) {
      toast.error("File name already exists");
      return;
    }

    setFiles(prev =>
      prev.map(file =>
        file.name === oldName ? { ...file, name: renameValue } : file
      )
    );
    socketRef.current?.emit("file_renamed", { roomId, oldName, newName: renameValue });

    // Update the selected file if it was renamed
    if (onFileSelect && files.find(f => f.name === oldName)) {
      onFileSelect({ name: renameValue, language: extension === "java" ? "java" : "python" });
    }

    setRenamingFile(null);
    setRenameValue("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center">
          <FaFolder className="mr-2" /> Files
        </h3>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="newfile.java"
            className="bg-gray-700 text-white p-1 rounded text-sm w-32"
          />
          <button onClick={addFile} className="p-1 bg-green-600 rounded hover:bg-green-700">
            <FaPlus />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {files.map((file) => (
          <div
            key={file.name}
            className="flex items-center justify-between p-2 hover:bg-gray-700 rounded cursor-pointer"
          >
            {renamingFile === file.name ? (
              <div className="flex items-center space-x-2 w-full">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="bg-gray-700 text-white p-1 rounded text-sm flex-1"
                  autoFocus
                />
                <button
                  onClick={() => renameFile(file.name)}
                  className="p-1 bg-blue-600 rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setRenamingFile(null)}
                  className="p-1 bg-gray-600 rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div
                  onClick={() => onFileSelect(file)}
                  className="flex items-center flex-1"
                >
                  <FaFile className="mr-2" />
                  {file.name}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => startRenaming(file)}
                    className="p-1 text-blue-400 hover:text-blue-300"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => deleteFile(file.name)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <FaTrash />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;