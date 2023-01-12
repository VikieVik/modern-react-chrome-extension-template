import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { MemoryRouter as Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import { CreditCountContextProvider } from "./Context/creditCountContext";

const history = createMemoryHistory();

ReactDOM.render(
  <React.StrictMode>
    <Router history={history}>
      <CreditCountContextProvider>
        <App />
      </CreditCountContextProvider>
    </Router>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
