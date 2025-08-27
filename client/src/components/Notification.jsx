// src/components/Notification.jsx
import React from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaTimesCircle, FaInfoCircle } from "react-icons/fa"; // Importing icons

const Notification = () => {

  // Custom notification styling and options
  const notifySuccess = () => {
    toast.success(
      <div className="flex items-center">
        <FaCheckCircle className="mr-2 text-green-500" />
        Success notification!
      </div>,
      {
        position: toast.POSITION.TOP_RIGHT,
        autoClose: 3000,
        hideProgressBar: false,
        closeButton: true,
        className: "bg-green-600 text-white rounded-lg shadow-lg",
      }
    );
  };

  const notifyError = () => {
    toast.error(
      <div className="flex items-center">
        <FaTimesCircle className="mr-2 text-red-500" />
        Error notification!
      </div>,
      {
        position: toast.POSITION.TOP_RIGHT,
        autoClose: 3000,
        hideProgressBar: false,
        closeButton: true,
        className: "bg-red-600 text-white rounded-lg shadow-lg",
      }
    );
  };

  const notifyInfo = () => {
    toast.info(
      <div className="flex items-center">
        <FaInfoCircle className="mr-2 text-blue-500" />
        Info notification!
      </div>,
      {
        position: toast.POSITION.TOP_RIGHT,
        autoClose: 3000,
        hideProgressBar: false,
        closeButton: true,
        className: "bg-blue-600 text-white rounded-lg shadow-lg",
      }
    );
  };

  return (
    <div className="flex flex-col space-y-2">
      <button
        onClick={notifySuccess}
        className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition"
      >
        Show Success
      </button>
      <button
        onClick={notifyError}
        className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition"
      >
        Show Error
      </button>
      <button
        onClick={notifyInfo}
        className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
      >
        Show Info
      </button>
    </div>
  );
};

export default Notification;
