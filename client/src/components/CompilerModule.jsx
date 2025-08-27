import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaPlay, FaStop, FaCode, FaCog, FaPlus, FaTrash } from "react-icons/fa";
import toast from "react-hot-toast";
import axios from "axios";

const CompilerModule = ({ socketRef, roomId, codeRef, file }) => {
  const [testCases, setTestCases] = useState([
    { id: 1, input: "", expectedOutput: "", output: "", status: "" },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [compilerOptions, setCompilerOptions] = useState({
    autoCompile: false,
    compileDelay: 1000,
    showSettings: false,
    mode: "testCase",
  });
  const [jdoodleUsage, setJdoodleUsage] = useState(null);
  const [inputOnlyValue, setInputOnlyValue] = useState("");
  const [inputOnlyOutput, setInputOnlyOutput] = useState("");
  const compileTimeoutRef = useRef(null);
  const lastRunTimeRef = useRef(0);

  useEffect(() => {
    if (!socketRef.current) return;

    // Listeners for Test Case Mode
    socketRef.current.on("compiler_test_cases_update", ({ testCases }) => {
      setTestCases(testCases);
    });

    socketRef.current.on("compiler_status_change", ({ isRunning: status }) => {
      setIsRunning(status);
    });

    // Listeners for Input-Only Mode
    socketRef.current.on("input_only_update", ({ input }) => {
      setInputOnlyValue(input);
    });

    socketRef.current.on("input_only_output_update", ({ output }) => {
      setInputOnlyOutput(output);
    });

    return () => {
      socketRef.current?.off("compiler_test_cases_update");
      socketRef.current?.off("compiler_status_change");
      socketRef.current?.off("input_only_update");
      socketRef.current?.off("input_only_output_update");
    };
  }, [socketRef]);

  useEffect(() => {
    if (!compilerOptions.autoCompile || !codeRef.current[file.name]) return;
    if (compileTimeoutRef.current) clearTimeout(compileTimeoutRef.current);
    compileTimeoutRef.current = setTimeout(runAllTestCases, compilerOptions.compileDelay);
    return () => clearTimeout(compileTimeoutRef.current);
  }, [codeRef.current[file.name], compilerOptions.autoCompile]);

  useEffect(() => {
    const checkJdoodleUsage = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/jdoodle-usage");
        setJdoodleUsage(response.data.used);
        if (response.data.used > 180) {
          toast.warn(`JDoodle API usage: ${response.data.used}/200. Approaching limit!`);
        }
      } catch (error) {
        console.error("Error checking JDoodle usage:", error);
      }
    };

    checkJdoodleUsage();
    const interval = setInterval(checkJdoodleUsage, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleTestCaseChange = (id, field, value) => {
    const updatedTestCases = testCases.map((tc) =>
      tc.id === id ? { ...tc, [field]: value } : tc
    );
    setTestCases(updatedTestCases);
    socketRef.current?.emit("compiler_test_cases_update", { roomId, testCases: updatedTestCases });
  };

  const addTestCase = () => {
    const newId = testCases.length ? testCases[testCases.length - 1].id + 1 : 1;
    const newTestCases = [...testCases, { id: newId, input: "", expectedOutput: "", output: "", status: "" }];
    setTestCases(newTestCases);
    socketRef.current?.emit("compiler_test_cases_update", { roomId, testCases: newTestCases });
  };

  const removeTestCase = (id) => {
    if (testCases.length === 1) {
      toast.error("At least one test case is required!");
      return;
    }
    const updatedTestCases = testCases.filter((tc) => tc.id !== id);
    setTestCases(updatedTestCases);
    socketRef.current?.emit("compiler_test_cases_update", { roomId, testCases: updatedTestCases });
  };

  const handleInputOnlyChange = (value) => {
    setInputOnlyValue(value);
    socketRef.current?.emit("input_only_update", { roomId, input: value });
  };

  const runAllTestCases = useCallback(async () => {
    if (!codeRef.current[file.name]) {
      toast.error("No code to compile");
      return;
    }

    const hasValidTestCases = testCases.some((tc) => tc.input && tc.expectedOutput);
    if (!hasValidTestCases) {
      toast.error("At least one test case must have both input and expected output!");
      return;
    }

    const now = Date.now();
    if (now - lastRunTimeRef.current < 2000) {
      toast.error("Please wait before running again.");
      return;
    }
    lastRunTimeRef.current = now;

    try {
      setIsRunning(true);
      socketRef.current?.emit("compiler_status_change", { roomId, isRunning: true });
      toast.loading("Running test cases...");

      const resetTestCases = testCases.map((tc) => ({
        ...tc,
        output: "",
        status: "",
      }));
      setTestCases(resetTestCases);
      socketRef.current?.emit("compiler_test_cases_update", { roomId, testCases: resetTestCases });

      const updatedTestCases = await Promise.all(
        resetTestCases.map(async (testCase) => {
          if (!testCase.input || !testCase.expectedOutput) {
            return { ...testCase, output: "", status: "skipped" };
          }

          try {
            const response = await axios.post("http://localhost:5000/api/execute", {
              script: codeRef.current[file.name],
              language: file.language === "java" ? "java" : "python3",
              stdin: testCase.input,
            });

            const result = response.data;
            const outputText = result.output || result.error || "No output";
            const status = outputText.trim() === testCase.expectedOutput.trim() ? "passed" : "failed";
            return { ...testCase, output: outputText, status };
          } catch (error) {
            console.error(`Test case ${testCase.id} failed:`, error);
            if (error.response?.status === 429) {
              toast.error("JDoodle API rate limit exceeded. Please wait and try again later.");
              return { ...testCase, output: "Rate limit exceeded", status: "error" };
            }
            return { ...testCase, output: error.response?.data?.error || error.message, status: "error" };
          }
        })
      );

      setTestCases(updatedTestCases);
      socketRef.current?.emit("compiler_test_cases_update", { roomId, testCases: updatedTestCases });

      setIsRunning(false);
      socketRef.current?.emit("compiler_status_change", { roomId, isRunning: false });
      toast.dismiss();
      toast.success("Test cases executed successfully");
    } catch (error) {
      console.error("Compilation error:", error);
      setIsRunning(false);
      socketRef.current?.emit("compiler_status_change", { roomId, isRunning: false });
      toast.dismiss();
      toast.error("Failed to run test cases: " + (error.response?.data?.error || error.message));
    }
  }, [codeRef, file, roomId, testCases]);

  const runInputOnly = useCallback(async () => {
    if (!codeRef.current[file.name]) {
      toast.error("No code to compile");
      return;
    }

    if (!inputOnlyValue) {
      toast.error("Please provide an input!");
      return;
    }

    const now = Date.now();
    if (now - lastRunTimeRef.current < 2000) {
      toast.error("Please wait before running again.");
      return;
    }
    lastRunTimeRef.current = now;

    try {
      setIsRunning(true);
      socketRef.current?.emit("compiler_status_change", { roomId, isRunning: true });
      toast.loading("Running program...");

      const response = await axios.post("http://localhost:5000/api/execute", {
        script: codeRef.current[file.name],
        language: file.language === "java" ? "java" : "python3",
        stdin: inputOnlyValue,
      });

      const result = response.data;
      const outputText = result.output || result.error || "No output";
      setInputOnlyOutput(outputText);
      socketRef.current?.emit("input_only_output_update", { roomId, output: outputText });

      setIsRunning(false);
      socketRef.current?.emit("compiler_status_change", { roomId, isRunning: false });
      toast.dismiss();
      toast.success("Program executed successfully");
    } catch (error) {
      console.error("Input-only execution error:", error);
      setIsRunning(false);
      socketRef.current?.emit("compiler_status_change", { roomId, isRunning: false });
      toast.dismiss();
      if (error.response?.status === 429) {
        toast.error("JDoodle API rate limit exceeded. Please wait and try again later.");
        setInputOnlyOutput("Rate limit exceeded");
        socketRef.current?.emit("input_only_output_update", { roomId, output: "Rate limit exceeded" });
      } else {
        const errorMessage = error.response?.data?.error || error.message;
        toast.error("Failed to run program: " + errorMessage);
        setInputOnlyOutput(errorMessage);
        socketRef.current?.emit("input_only_output_update", { roomId, output: errorMessage });
      }
    }
  }, [codeRef, file, roomId, inputOnlyValue]);

  const stopExecution = () => {
    setIsRunning(false);
    toast.dismiss();
    toast.success("Execution stopped");
    socketRef.current?.emit("compiler_status_change", { roomId, isRunning: false });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-medium text-white flex items-center">
          <FaCode className="mr-2" /> Compiler - {file.name}
          {jdoodleUsage !== null && (
            <span className="ml-2 text-sm text-gray-400">
              (JDoodle Usage: {jdoodleUsage}/200)
            </span>
          )}
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setCompilerOptions((prev) => ({
              ...prev,
              mode: prev.mode === "testCase" ? "inputOnly" : "testCase",
            }))}
            className="px-4 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
          >
            {compilerOptions.mode === "testCase" ? "Switch to Input-Only Mode" : "Switch to Test Case Mode"}
          </button>
          <button
            onClick={compilerOptions.mode === "testCase" ? runAllTestCases : runInputOnly}
            disabled={isRunning}
            className={`px-4 py-1 rounded flex items-center ${isRunning ? "bg-gray-600 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
          >
            <FaPlay className="mr-1" /> Run {compilerOptions.mode === "testCase" ? "All" : ""}
          </button>
          {isRunning && (
            <button
              onClick={stopExecution}
              className="px-4 py-1 rounded flex items-center bg-red-600 hover:bg-red-700"
            >
              <FaStop className="mr-1" /> Stop
            </button>
          )}
          <button
            onClick={() => setCompilerOptions((prev) => ({ ...prev, showSettings: !prev.showSettings }))}
            className="p-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            <FaCog />
          </button>
        </div>
      </div>
      {compilerOptions.showSettings && (
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoCompile"
              checked={compilerOptions.autoCompile}
              onChange={() => setCompilerOptions((prev) => ({ ...prev, autoCompile: !prev.autoCompile }))}
              className="mr-2"
            />
            <label htmlFor="autoCompile" className="text-white text-sm">Auto-run test cases</label>
          </div>
        </div>
      )}
      <div className="flex-1 p-1 overflow-y-auto">
        {compilerOptions.mode === "testCase" ? (
          <div className="space-y-2">
            {testCases.map((testCase) => (
              <div key={testCase.id} className="bg-gray-800 rounded p-3 flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm font-medium">Test Case {testCase.id}</span>
                  <button
                    onClick={() => removeTestCase(testCase.id)}
                    className="text-gray-400 hover:text-red-400"
                    disabled={isRunning}
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col">
                    <label className="text-gray-300 text-xs font-medium mb-1">Input</label>
                    <textarea
                      value={testCase.input}
                      onChange={(e) => handleTestCaseChange(testCase.id, "input", e.target.value)}
                      placeholder="Enter input..."
                      className="w-full h-20 bg-gray-700 p-2 text-white font-mono resize-none focus:outline-none rounded"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-gray-300 text-xs font-medium mb-1">Expected Output</label>
                    <textarea
                      value={testCase.expectedOutput}
                      onChange={(e) => handleTestCaseChange(testCase.id, "expectedOutput", e.target.value)}
                      placeholder="Enter expected output..."
                      className="w-full h-20 bg-gray-700 p-2 text-white font-mono resize-none focus:outline-none rounded"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-gray-300 text-xs font-medium mb-1">Output</label>
                    <textarea
                      value={testCase.output}
                      readOnly
                      placeholder="Output will appear here..."
                      className={`w-full h-20 bg-gray-700 p-2 text-white font-mono resize-none focus:outline-none rounded ${
                        testCase.status === "passed" ? "border-green-500 border" : testCase.status === "failed" ? "border-red-500 border" : testCase.status === "error" ? "border-red-500 border" : ""
                      }`}
                    />
                    {testCase.status && (
                      <span
                        className={`mt-1 text-xs font-medium ${
                          testCase.status === "passed" ? "text-green-500" : testCase.status === "failed" ? "text-red-500" : testCase.status === "error" ? "text-red-500" : "text-yellow-500"
                        }`}
                      >
                        {testCase.status.charAt(0).toUpperCase() + testCase.status.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addTestCase}
              className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center text-white"
              disabled={isRunning}
            >
              <FaPlus className="mr-1" /> Add Test Case
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="bg-gray-800 rounded p-3 flex flex-col space-y-2">
              <div className="flex flex-col">
                <label className="text-gray-300 text-xs font-medium mb-1">Input</label>
                <textarea
                  value={inputOnlyValue}
                  onChange={(e) => handleInputOnlyChange(e.target.value)}
                  placeholder="Enter input..."
                  className="w-full h-20 bg-gray-700 p-2 text-white font-mono resize-none focus:outline-none rounded"
                  disabled={isRunning}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-gray-300 text-xs font-medium mb-1">Output</label>
                <textarea
                  value={inputOnlyOutput}
                  readOnly
                  placeholder="Output will appear here..."
                  className="w-full h-20 bg-gray-700 p-2 text-white font-mono resize-none focus:outline-none rounded"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompilerModule;