import React, { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { closeBrackets } from "@codemirror/autocomplete";
import { lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, undo, redo } from "@codemirror/commands";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { nord } from "@uiw/codemirror-theme-nord";
import { monokai } from "@uiw/codemirror-theme-monokai";
import { solarizedDark, solarizedLight } from "@uiw/codemirror-theme-solarized";
import { githubLight } from "@uiw/codemirror-theme-github";
import { tomorrowNightBlue } from "@uiw/codemirror-theme-tomorrow-night-blue";
import { xcodeLight } from "@uiw/codemirror-theme-xcode";
import { FaUndo, FaRedo, FaDownload } from "react-icons/fa"; // Added FaDownload for the download button
import toast from "react-hot-toast";

// Map theme names to CodeMirror theme extensions
const themeMap = {
    "vs-dark": [], // CodeMirror's default dark theme
    "oneDark": oneDark,
    "dracula": dracula,
    "monokai": monokai,
    "solarized-dark": solarizedDark,
    "solarized-light": solarizedLight,
    "nord": nord,
    "github": githubLight,
    "tomorrow": tomorrowNightBlue,
    "xcode": xcodeLight,
    "ambiance": dracula // Fallback to dracula since there's no direct "ambiance" theme
};

const Editor = ({ socketRef, roomId, onCodeChange, fontSize, fontFamily, theme, file }) => {
    const editorContainerRef = useRef(null);
    const editorRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const [typingUsers, setTypingUsers] = useState({});
    const currentUser = localStorage.getItem("username") || "Anonymous";

    const notifyTyping = () => {
        if (socketRef.current) {
            socketRef.current.emit("user_typing_start", { roomId, username: currentUser });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current.emit("user_typing_end", { roomId, username: currentUser });
            }, 1000);
        }
    };

    useEffect(() => {
        if (!editorContainerRef.current) return;

        const languageExtensions = {
            java: java(),
            python: python(),
        };

        const selectedTheme = themeMap[theme] || themeMap["vs-dark"]; // Fallback to default dark theme

        const startState = EditorState.create({
            doc: localStorage.getItem(`code_${file.name}`) || "",
            extensions: [
                languageExtensions[file.language] || java(),
                selectedTheme,
                closeBrackets(),
                lineNumbers(),
                history(), // Enable history for undo/redo
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        const code = update.state.doc.toString();
                        onCodeChange(code, file.name);
                        notifyTyping();
                    }
                }),
                keymap.of([
                    ...defaultKeymap,
                    ...historyKeymap, // Default history keybindings (Ctrl+Z, Ctrl+Y, etc.)
                    { key: "Mod-z", run: undo }, // Ctrl+Z or Cmd+Z for undo
                    { key: "Mod-y", run: redo }, // Ctrl+Y or Cmd+Y for redo
                    { key: "Mod-Shift-z", run: redo, preventDefault: true }, // Cmd+Shift+Z for redo on Mac
                ]),
                EditorView.theme({
                    "&": { fontSize: `${fontSize}px`, height: "100%", width: "100%" },
                    ".cm-scroller": { 
                        fontFamily: fontFamily || "monospace", 
                        lineHeight: "1.6", 
                        height: "100%", 
                        overflow: "auto", // Enable scrolling for CodeMirror
                        scrollbarWidth: "thin", // For Firefox
                        scrollbarColor: "#6b7280 #1f2937" // Thumb and track colors for Firefox
                    },
                    ".cm-content": { caretColor: "#fff" },
                    ".cm-line": { padding: "0 8px", whiteSpace: "pre" }, // Prevent line wrapping
                    ".cm-gutters": { backgroundColor: "#1f2937", color: "#9ca3af" }
                }),
            ],
        });

        const view = new EditorView({
            state: startState,
            parent: editorContainerRef.current,
        });

        editorRef.current = view;

        return () => {
            editorRef.current?.destroy();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [fontSize, fontFamily, theme, onCodeChange, file]);

    useEffect(() => {
        if (!socketRef.current) return;

        socketRef.current.on("user_typing_start", ({ username }) => {
            if (username !== currentUser) {
                setTypingUsers((prev) => ({ ...prev, [username]: true }));
            }
        });

        socketRef.current.on("user_typing_end", ({ username }) => {
            if (username !== currentUser) {
                setTypingUsers((prev) => {
                    const newState = { ...prev };
                    delete newState[username];
                    return newState;
                });
            }
        });

        return () => {
            socketRef.current?.off("user_typing_start");
            socketRef.current?.off("user_typing_end");
        };
    }, [socketRef, currentUser]);

    // Undo and Redo handlers
    const handleUndo = () => {
        if (editorRef.current) {
            const success = undo(editorRef.current);
            if (success) {
                toast.success("Undo performed");
            } else {
                toast.error("Nothing to undo");
            }
            editorRef.current.focus();
        }
    };

    const handleRedo = () => {
        if (editorRef.current) {
            const success = redo(editorRef.current);
            if (success) {
                toast.success("Redo performed");
            } else {
                toast.error("Nothing to redo");
            }
            editorRef.current.focus();
        }
    };

    // Download handler
    const handleDownload = () => {
        if (editorRef.current) {
            const code = editorRef.current.state.doc.toString();
            if (!code) {
                toast.error("No code to download");
                return;
            }

            // Determine the file extension based on the language
            const extension = file.language === "java" ? "java" : "py";
            const fileName = `${file.name.split(".")[0]}.${extension}`; // Ensure correct extension

            // Create a Blob with the code content
            const blob = new Blob([code], { type: "text/plain" });
            const url = URL.createObjectURL(blob);

            // Create a temporary <a> element to trigger the download
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(`Downloaded ${fileName}`);
        }
    };

    return (
        <div className="h-full w-full bg-gray-900 relative">
            <div className="p-2 bg-gray-800 flex justify-between items-center border-b border-gray-700/30">
                <div className="text-gray-300 text-sm flex items-center min-h-[24px] font-medium font-mono">
                    {/* Undo Button */}
                    <button
                        onClick={handleUndo}
                        className="p-1 mr-2 text-gray-400 hover:text-gray-200"
                        title="Undo (Ctrl+Z)"
                    >
                        <FaUndo size={14} />
                    </button>
                    {/* Redo Button */}
                    <button
                        onClick={handleRedo}
                        className="p-1 mr-2 text-gray-400 hover:text-gray-200"
                        title="Redo (Ctrl+Y)"
                    >
                        <FaRedo size={14} />
                    </button>
                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        className="p-1 mr-2 text-gray-400 hover:text-gray-200"
                        title="Download Code"
                    >
                        <FaDownload size={14} />
                    </button>
                    {Object.keys(typingUsers).length > 0 && (
                        <span className="text-blue-400">
                            {Object.keys(typingUsers).join(", ")} typing...
                        </span>
                    )}
                </div>
                <div className="text-gray-200 text-sm font-medium font-mono">
                    {file.name}
                </div>
            </div>
            <div 
                ref={editorContainerRef} 
                className="h-[calc(100%-40px)] w-full relative border-t border-gray-700/30 overflow-auto"
            />
            <style jsx>{`
                /* Custom scrollbar styles for Webkit browsers (Chrome, Safari, Edge) */
                .cm-scroller::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .cm-scroller::-webkit-scrollbar-track {
                    background: #1f2937; /* Match the gutter background */
                }
                .cm-scroller::-webkit-scrollbar-thumb {
                    background: #6b7280; /* Gray thumb to match the theme */
                    border-radius: 4px;
                }
                .cm-scroller::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af; /* Lighter gray on hover */
                }
            `}</style>
        </div>
    );
};

export default Editor;