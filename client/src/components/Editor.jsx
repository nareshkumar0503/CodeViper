import React, { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { closeBrackets } from "@codemirror/autocomplete";
import { lineNumbers } from '@codemirror/view';
import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    // Initialize CodeMirror 6 editor
    editorRef.current = new EditorView({
      parent: editorContainerRef.current,
      extensions: [
        javascript(),              // Language mode: JavaScript
        oneDark,                   // Theme: One Dark
        closeBrackets(),           // Auto-close brackets
        lineNumbers(),             // Display line numbers
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const code = update.state.doc.toString();
            onCodeChange(code);
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              code,
            });
          }
        }),
      ],
    });

    // Cleanup on component unmount
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, [socketRef, roomId, onCodeChange]);

  useEffect(() => {
    if (socketRef.current) {
      // Listening for code changes from other users
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        // Prevent re-applying code if it's already the same
        if (code !== editorRef.current.state.doc.toString()) {
          editorRef.current.dispatch({
            changes: { from: 0, to: editorRef.current.state.doc.length, insert: code },
          });
        }
      });
    }

    // Cleanup socket event listener
    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CODE_CHANGE);
      }
    };
  }, [socketRef]);

  return (
    <>
      <style>{`
        .homePageWrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          height: 100vh;
        }

        .formWrapper {
          background: #282a36;
          padding: 20px;
          border-radius: 10px;
          width: 100%;
          max-width: 90%;
        }

        .mainWrap {
          display: grid;
          grid-template-columns: 230px 1fr;
        }

        .CodeMirror {
          min-height: calc(100vh - 20px);
          font-size: 20px;
          line-height: 1.6;
          padding-top: 20px;
          width: 100%;
        }

        .inputBox {
          padding: 10px;
          border-radius: 5px;
          outline: none;
          border: none;
          margin-bottom: 14px;
          background: #eee;
          font-size: 16px;
          font-weight: bold;
          color: black;
        }

        .btn {
          border: none;
          padding: 10px;
          border-radius: 5px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease-in-out;
        }

        .joinBtn,
        .leaveBtn {
          background: #4aed88;
          width: 100px;
          margin-left: auto;
          margin-bottom: 20px;
        }

        .joinBtn:hover,
        .leaveBtn:hover {
          background: #2b824c;
        }
      `}</style>
      <div className="homePageWrapper">
        <div className="formWrapper">
          <div ref={editorContainerRef} className="CodeMirror"></div>
        </div>
      </div>
    </>
  );
};

export default Editor;
