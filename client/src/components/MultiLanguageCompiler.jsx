import React, { useState } from 'react';

const MultiLanguageCompiler = () => {
  const [language, setLanguage] = useState('JavaScript');
  const [code, setCode] = useState('');

  const compileCode = () => {
    alert(`Compiling ${language} code...`);
  };

  return (
    <div className="compiler bg-lightGray p-4 mb-4">
      <h4 className="mb-4">Compiler</h4>
      <select
        className="p-2 border rounded-md mb-4"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value="JavaScript">JavaScript</option>
        <option value="Python">Python</option>
        <option value="C++">C++</option>
        <option value="Java">Java</option>
      </select>
      <textarea
        className="w-full p-2 border rounded-md mb-4"
        rows="6"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Write your code here..."
      />
      <button
        className="bg-primary text-white p-2 rounded-md"
        onClick={compileCode}
      >
        Run Code
      </button>
    </div>
  );
};

export default MultiLanguageCompiler;
