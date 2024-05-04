import { configureStore } from "@reduxjs/toolkit";
import { currenciesSlice } from "./currenciesSlice";


export const store = configureStore({
    reducer: currenciesSlice.reducer
})

