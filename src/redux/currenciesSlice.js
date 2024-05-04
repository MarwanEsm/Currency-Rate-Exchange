import { createSlice } from "@reduxjs/toolkit";

export const currenciesSlice = createSlice({
    name: "currencies",
    initialState: {
        errorCode: null,
    },
    reducers: {
        setErrorCode: (state, action) => {
            state.errorCode = action.payload;
        }
    }
});

export const { setErrorCode } = currenciesSlice.actions; 
