import React, { useEffect } from "react";
import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./Pages/Home";


/*global chrome*/

function App() {

  console.log("Leadzilla popup loaded");

  //Chrome extention communication port for bi-directional communication between popup and background.js
  var port = chrome.extension.connect({
    name: "Sample Communication",
  });

    //Listen for messages from content.js
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log(message);
  
      if (message.command === "ready-to-scrape") {
        sendResponse({
          data: "leadzilla-launched",
        });
      }
    });

  //restart scrapping message sent to background.js whenever leadzilla app is launched
  useEffect(() => {
    port.postMessage("scrape-data");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/" element={<Navigate to="/home" />} />
      </Routes>
    </div>
  );
}

export default App;
