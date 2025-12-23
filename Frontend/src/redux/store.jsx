import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';

import { configureStore } from '@reduxjs/toolkit';
import editorReducer from "./editorReducer";

const persistConfig = {
    key: "root",
    storage,
    // Blacklist large data fields to prevent localStorage quota exceeded errors
    // These contain base64 image data which can be several MBs
    blacklist: ['editorPages', 'uploadsPhotos', 'generatedImages', 'savedTemplates'],
};

const persistedReducer = persistReducer(persistConfig, editorReducer);

export const store = configureStore({
    reducer: {
        "editor": persistedReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // not warning for persist 
        }),
});

export const persistor = persistStore(store);