import { createSlice } from "@reduxjs/toolkit";

export const currenciesSlice = createSlice({
    name: "currencies",
    initialState: {
        error: {
            errorCode: null,
            message: ""
        },

    },
    reducers: {
        setError: (state, action) => {
            state.error = action.payload;
        }
    }
});

export const { setError } = currenciesSlice.actions; 
