import { useState, useContext, createContext } from 'react';

const LocalStateContext = createContext();
const LocalStateProvider = LocalStateContext.Provider;

function CartStateProvider( { children } ) {
// Custom Provider
// Stores State and Functionality

    const [cartOpen, setCartOpen] = useState(false);


}