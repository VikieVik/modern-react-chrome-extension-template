import React, { useState, createContext } from "react";

export const CreditCountContext = createContext();

export const CreditCountContextProvider = (props) => {
  const [creditCount, setCreditCount] = useState(0);

  return (
    <CreditCountContext.Provider value={[creditCount, setCreditCount]}>
      {props.children}
    </CreditCountContext.Provider>
  );
};
